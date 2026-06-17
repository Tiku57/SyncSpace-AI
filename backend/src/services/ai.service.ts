import { GoogleGenAI, Type, Schema } from '@google/genai';
import { WorkspaceItem } from '../types';
import { buildWorkspaceContext } from './context.service';
import { memoryStore } from '../store/memory.store';
import { resolveLayout } from './layoutEngine';

// We instantiate without passing an API key directly; it will automatically pick up GEMINI_API_KEY from process.env
const ai = new GoogleGenAI({});

// ── Timeout Utility ──
const LLM_CALL_TIMEOUT_MS = 15_000; // 15s per LLM call
const CLASSIFIER_TIMEOUT_MS = 5_000; // 5s for intent classification

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
    )
  ]);
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "Your natural language response, sales pitch, or explanation."
    },
    actions: {
      type: Type.ARRAY,
      description: "A list of actions to modify the 3D workspace.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["add", "remove", "update", "clear_workspace"] },
          itemId: { type: Type.STRING, description: "Required for remove and update. The exact ID of the item." },
          item: {
            type: Type.OBJECT,
            description: "Required for add and update. The item data.",
            properties: {
              type: { type: Type.STRING, enum: ["desk", "chair", "monitor", "laptop", "tablet", "keyboard", "mouse", "stand", "box", "tv", "speakers"] },
              name: { type: Type.STRING },
              price: { type: Type.INTEGER }
            }
          }
        }
      }
    }
  },
  required: ["reply", "actions"]
};

export class AIService {
  private activeControllers: Map<string, AbortController> = new Map();

  public cancelRequestsForSocket(socketId: string) {
    if (this.activeControllers.has(socketId)) {
      console.log(`[ABORT] Cancelling active AI request for socket ${socketId}`);
      this.activeControllers.get(socketId)?.abort();
      this.activeControllers.delete(socketId);
    }
  }

  public async processUserMessage(
    socketId: string,
    text: string, 
    currentWorkspace: WorkspaceItem[],
    onChunk: (chunk: string) => void
  ): Promise<{
    reply: string;
    actions: { type: 'add' | 'update' | 'remove' | 'recommendation' | 'sync' | 'clear_workspace', item?: WorkspaceItem, itemId?: string, payload?: any, workspace?: WorkspaceItem[] }[];
  }> {
    
    if (!memoryStore[socketId]) {
      memoryStore[socketId] = [];
    }
    const history = memoryStore[socketId];

    // Cancel any previous request for this socket
    this.cancelRequestsForSocket(socketId);
    
    // Create new abort controller
    const controller = new AbortController();
    this.activeControllers.set(socketId, controller);

    try {
      console.log('\n[CHAT]');
    console.log(`User: ${text}`);
    
    console.log('\n[WORKSPACE]');
    console.log(`${currentWorkspace.length} products loaded`);

    let context = "";
    try {
      context = buildWorkspaceContext(currentWorkspace);
      console.log('\n[ANALYTICS]');
      console.log('Success (Extracted in context builder)');
    } catch (e: any) {
      console.log('\n[ERROR]');
      console.log('Context Builder Error:', e.message);
      // Fallback context
      context = "Workspace currently has " + currentWorkspace.length + " items.";
    }

    // Intent Classification Layer
    const classifierPrompt = `Classify the user's intent into ONE of the following categories:
CREATE_WORKSPACE - User wants to build a new setup from scratch
UPDATE_WORKSPACE - User wants to add, replace, change, swap, or upgrade items in their current setup
DELETE_ITEMS - User wants to remove specific items
CLEAR_WORKSPACE - User explicitly wants to clear, reset, or start over completely
OPTIMIZE_BUDGET - User wants to save money, reduce cost, or optimize the budget
ANALYZE_WORKSPACE - User is asking a question about ergonomics, productivity, or layout without modifying it

User message: "${text}"
Respond with ONLY the exact category name.`;

    let intent = 'CREATE_WORKSPACE';
    try {
       if (controller.signal.aborted) throw new Error('AbortError');
       const classifierChat = ai.chats.create({ model: "gemini-2.5-flash", config: { temperature: 0 } });
       const res = await withTimeout(
         classifierChat.sendMessage({ message: classifierPrompt }),
         CLASSIFIER_TIMEOUT_MS,
         'Intent classifier'
       );
       intent = res.text?.trim() || 'CREATE_WORKSPACE';
    } catch(e: any) {
       if (e?.message === 'AbortError') throw e;
       console.log(`Classifier failed (${e?.message || 'unknown'}), defaulting to CREATE_WORKSPACE`);
    }
    console.log(`\n[INTENT CLASSIFIED] ${intent}`);

    const lowerText = text.toLowerCase();
    if (lowerText.includes('save') || lowerText.includes('budget') || lowerText.includes('cheaper') || lowerText.includes('reduce cost') || lowerText.includes('lower price') || lowerText.includes('optimize spending') || lowerText.includes('cost effective') || lowerText.match(/reduce.*?\$?\s*(\d+)/i)) {
      intent = 'OPTIMIZE_BUDGET';
    }

    if (intent.includes('CLEAR_WORKSPACE')) {
      return {
        reply: "I've cleared the workspace completely. We can start fresh!",
        actions: [{ type: 'clear_workspace' }]
      };
    }

    let targetSavings = 0;
    if (intent.includes('OPTIMIZE_BUDGET')) {
      const savingsMatch = text.match(/(?:save|reduce|cut|cheaper).*?\$?\s*(\d+)/i) || text.match(/\$?(\d+).*?(?:save|reduce|cut|cheaper)/i);
      if (savingsMatch && savingsMatch[1]) {
        targetSavings = parseInt(savingsMatch[1], 10);
      } else {
        // Default to a 20% savings target if no explicit number is given
        const currentTotal = currentWorkspace.reduce((sum, item) => sum + item.price, 0);
        targetSavings = Math.floor(currentTotal * 0.2);
      }
      
      console.log('\n[INTENT]\nOPTIMIZE_BUDGET');
      const currentCost = currentWorkspace.reduce((sum, item) => sum + item.price, 0);
      console.log(`\n[CURRENT_COST]\n$${currentCost}`);
      console.log(`\n[TARGET_SAVINGS]\n$${targetSavings}`);
      
      const protectedItems = currentWorkspace.filter(item => {
        const type = item.type.toLowerCase();
        const isProtected = lowerText.includes(`keep ${type}`) || lowerText.includes(`preserve ${type}`) || lowerText.includes(`don't remove ${type}`) || lowerText.includes(`without losing the ${type}`);
        return isProtected;
      });
      console.log(`\n[PROTECTED_ITEMS]\n${protectedItems.map(i => i.name).join(', ') || 'None'}`);

      // Budget Optimization Algorithm
      let actualSavings = 0;
      let localWorkspace = [...currentWorkspace];
      const optimizationSteps: string[] = [];
      const actions: any[] = [];
      
      // Sort candidates by cost reduction potential (price descending)
      const candidates = [...currentWorkspace]
        .filter(i => !protectedItems.some(p => p.id === i.id))
        .sort((a, b) => b.price - a.price);

      for (const item of candidates) {
        if (actualSavings >= targetSavings) break;
        
        // Product catalog alternatives for downgrading
        const alternatives: Record<string, {name: string, price: number}[]> = {
          'chair': [{name: 'Ergonomic Chair', price: 700}, {name: 'Standard Office Chair', price: 200}],
          'desk': [{name: 'Standard Standing Desk', price: 500}, {name: 'Basic Desk', price: 150}],
          'monitor': [{name: '4K Monitor', price: 500}, {name: '1080p Monitor', price: 150}],
          'speakers': [{name: 'Bookshelf Speakers', price: 150}, {name: 'Basic Speakers', price: 50}],
          'tv': [{name: 'LED TV', price: 600}, {name: 'Budget TV', price: 300}],
          'keyboard': [{name: 'Standard Keyboard', price: 80}],
          'mouse': [{name: 'Standard Mouse', price: 40}],
          'laptop': [{name: 'Budget Laptop', price: 1000}],
          'box': [{name: 'Budget PC', price: 1200}]
        };

        const itemAlts = alternatives[item.type] || [];
        const cheaperAlt = itemAlts.find(alt => alt.price < item.price);
        
        console.log(`\n[OPTIMIZATION_STEP]\nEvaluating ${item.name} ($${item.price})`);

        if (cheaperAlt && (item.price - cheaperAlt.price) > 0) {
          const savings = item.price - cheaperAlt.price;
          actualSavings += savings;
          optimizationSteps.push(`* ${item.name} ($${item.price}) → ${cheaperAlt.name} ($${cheaperAlt.price})`);
          
          const updatedItem = { ...item, name: cheaperAlt.name, price: cheaperAlt.price, designImpact: 5 };
          const index = localWorkspace.findIndex(i => i.id === item.id);
          if (index !== -1) localWorkspace[index] = updatedItem;
          
          actions.push({ type: 'update', itemId: item.id, item: updatedItem });
        } else if (item.type !== 'desk' && item.type !== 'monitor') {
          // If no cheaper alternative and it's not a core item, remove it
          actualSavings += item.price;
          optimizationSteps.push(`* Removed ${item.name} ($${item.price})`);
          localWorkspace = localWorkspace.filter(i => i.id !== item.id);
          actions.push({ type: 'remove', itemId: item.id });
        }
      }
      
      console.log(`\n[FINAL_SAVINGS]\n$${actualSavings}`);
      
      // If we made changes, generate the response and bypass the LLM completely
      if (actions.length > 0) {
        const newTotal = localWorkspace.reduce((sum, item) => sum + item.price, 0);
        
        const reply = `Optimization complete.\n\nChanges Applied:\n${optimizationSteps.join('\n')}\n\nTarget Savings:\n$${targetSavings}\n\nActual Savings:\n$${actualSavings}\n\nNew Total:\n$${newTotal}`;
        
        // We only use the local layout engine to resolve overlaps if needed (though none should be added)
        const { resolvedWorkspace } = resolveLayout(localWorkspace);
        actions.push({ type: 'sync', workspace: resolvedWorkspace });
        
        console.log(`\n[WORKSPACE_SYNC]\nEmitting new layout`);
        
        return {
          reply,
          actions
        };
      }
      // If we couldn't optimize (e.g. everything is already budget or protected), fallback to LLM
    }

    const systemPrompt = `You are SyncSpace AI, a Principal Workspace Architect.
You help users design, analyze, and buy premium workstation setups.
You have FULL control over the user's 3D workspace. You can add, update, or remove items.

${context}

CLASSIFIED USER INTENT: ${intent}
${intent.includes('UPDATE_WORKSPACE') ? `CRITICAL INSTRUCTION: You MUST use the 'update' or 'remove' actions on existing items in the workspace using their exact 'itemId' from the context above. Do NOT use 'add' if you are replacing or upgrading an existing item. Modify the existing workspace! When updating, provide the 'itemId' and the new 'item' data.` : ''}
${intent.includes('OPTIMIZE_BUDGET') ? `CRITICAL INSTRUCTION: You MUST lower the total price of the workspace. ${targetSavings > 0 ? `The user explicitly requested to save exactly $${targetSavings}. You MUST iterate and downgrade/remove multiple items until the total price is lowered by at least $${targetSavings}. ` : ''}Replace expensive items with cheaper alternatives from the catalog using the 'update' action with their exact 'itemId'. Do NOT give generic advice. Generate the exact 'update' or 'remove' actions to lower prices. Format your output to explicitly list the Target Savings, Actual Savings, and New Total in your response text.` : ''}

AVAILABLE PRODUCT CATALOG:
(Use these exact names and realistic prices when adding or updating items. You can also invent similar high-end items if needed).

- Chairs: Herman Miller Embody ($1800), Herman Miller Aeron ($1500), Steelcase Gesture ($1200), Secretlab Titan Evo ($600)
- Desks: Secretlab Magnus Pro ($900), Uplift V2 Standing Desk ($800), Ikea Karlby + Alex ($300)
- Monitors: LG C3 OLED 42" ($1000), Dell U2723QE 4K ($600), Samsung Odyssey G9 ($1500), Apple Studio Display ($1600)
- Keyboards: Keychron Q1 Pro ($200), Logitech MX Mechanical ($170), HHKB Pro 3 ($300)
- Mice: Logitech MX Master 3S ($100), Razer DeathAdder V3 ($150), Apple Magic Trackpad ($130)
- PCs/Laptops: MacBook Pro M3 Max ($3500), Custom RTX 4090 PC ($4000), Mac Studio ($2000)
- Audio: Audioengine A2+ Speakers ($270), KEF LSX II ($1300)

EXPLICIT INSTRUCTIONS:
- Answer the user's question acting as a "Workspace Consultant".
- NEVER explain your choices. NEVER produce long paragraphs or essays.
- NEVER act like a conversational chatbot. Do NOT say "Sure, I can help with that."
- Your text reply MUST be a concise, bulleted action summary of exactly what was built or changed.
- Target response size: 1-3 short lines maximum. Example: "Created: \n* 1 standing desk\n* 2 LG monitors".
- When adding or updating an item, generate the precise name from the catalog or a realistic equivalent, and assign its exact price.
- Valid item 'type' enums for actions: "desk", "chair", "monitor", "laptop", "tablet", "keyboard", "mouse", "stand", "box", "tv", "speakers".
- The physics engine handles spatial alignment automatically.
- NEVER hallucinate items in your text that are not in your actions array.
- OBJECT PLACEMENT RULES:
  1. Check if a similar object (like a 'desk' or 'table') already exists in the workspace.
  2. NEVER create a duplicate 'desk' or 'table' if one already exists. Reuse the existing desk.
  3. If an object exists, modify or upgrade it instead of creating duplicates.
  4. Only add the explicitly requested new components.
- To clear the workspace, emit a single action with type "clear_workspace".`;

    console.log('\n[PROMPT GENERATED]');
    console.log('Success');
    
    console.log('\n[PROMPT CONTENT]');
    console.log(systemPrompt);

    console.log('\n[LLM REQUEST SENT]');
    console.log('Sending to gemini-2.5-flash...');

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => ({ text: p.text }))
      }))
    });

    let response: any;
    let data: any;
    let validationAttempts = 0;
    const maxValidationAttempts = 3;
    let finalSuccess = false;

    while (validationAttempts < maxValidationAttempts && !finalSuccess) {
      validationAttempts++;
      let apiSuccess = false;
      let apiRetries = 0;
      
      while (apiRetries < 3 && !apiSuccess) {
        if (controller.signal.aborted) throw new Error('AbortError');
        
        try {
          response = await withTimeout(
            chat.sendMessage({ message: text }),
            LLM_CALL_TIMEOUT_MS,
            `LLM call (attempt ${apiRetries + 1}, validation ${validationAttempts})`
          );
          apiSuccess = true;
        } catch (error: any) {
          if (error.name === 'AbortError' || error.message === 'AbortError') throw error;
          
          apiRetries++;
          console.log(`\n[API ERROR] Attempt ${apiRetries} failed: ${error.message}`);
          
          // Timeouts and server errors are retryable
          const isRetryable = error.message && (
            error.message.includes('429') || error.message.includes('500') ||
            error.message.includes('502') || error.message.includes('503') ||
            error.message.includes('504') || error.message.includes('TIMEOUT')
          );
          if (isRetryable) {
            if (apiRetries >= 3) break;
            const backoff = Math.pow(2, apiRetries) * 1000;
            console.log(`[BACKOFF] Waiting ${backoff}ms before retry...`);
            await new Promise(r => setTimeout(r, backoff));
          } else {
            break;
          }
        }
      }

      if (!apiSuccess || !response) break;

      try {
        data = JSON.parse(response.text);
      } catch (e: any) {
        console.log('\n[ERROR] Failed to parse JSON from model. Forcing retry.');
        history.push({ role: 'model', parts: [{ text: response.text }] });
        text = "VALIDATION FAILED: Your response was not valid JSON. Please generate valid JSON matching the schema.";
        continue;
      }

      // VALIDATION LOGIC
      let validationError = null;
      if (intent.includes('UPDATE_WORKSPACE') || intent.includes('OPTIMIZE_BUDGET')) {
        const actions = data.actions || [];
        if (actions.some((a: any) => a.type === 'clear_workspace')) {
          validationError = "VALIDATION FAILED: You must NOT use 'clear_workspace' when modifying an existing workspace. Use 'update' or 'remove' on existing items.";
        } else {
          const updateActions = actions.filter((a: any) => a.type === 'update');
          const removeActions = actions.filter((a: any) => a.type === 'remove');

          // If they removed EVERYTHING and added things, they tried to rebuild instead of update
          if (removeActions.length === currentWorkspace.length && currentWorkspace.length > 0 && updateActions.length === 0) {
            validationError = "VALIDATION FAILED: You removed every item and tried to rebuild the workspace from scratch. Do NOT do this. Use 'update' to modify existing items, and only 'add' for brand new additional items.";
          }

          if (intent.includes('OPTIMIZE_BUDGET') && !validationError) {
            const originalPrice = currentWorkspace.reduce((sum, item) => sum + item.price, 0);
            
            // Calculate new price
            let newPrice = originalPrice;
            for (const action of actions) {
              if (action.type === 'remove') {
                const item = currentWorkspace.find(i => i.id === action.itemId);
                if (item) newPrice -= item.price;
              } else if (action.type === 'add' && action.item) {
                newPrice += (action.item.price || 0);
              } else if (action.type === 'update' && action.itemId && action.item) {
                const item = currentWorkspace.find(i => i.id === action.itemId);
                if (item) {
                  newPrice -= item.price;
                  newPrice += (action.item.price || 0);
                }
              }
            }
            
            const actualSavings = originalPrice - newPrice;
            if (newPrice >= originalPrice && originalPrice > 0) {
              validationError = `VALIDATION FAILED: You were asked to optimize the budget, but the new total price ($${newPrice}) is not lower than the original price ($${originalPrice}). You MUST replace expensive items with cheaper ones or remove items to reduce the budget.`;
            } else if (targetSavings > 0 && actualSavings < targetSavings) {
              validationError = `VALIDATION FAILED: You only saved $${actualSavings}. The user requested to save at least $${targetSavings}. You MUST replace or remove MORE items until the total savings is >= $${targetSavings}. Do not stop early.`;
            }
          }
        }
      }

      if (validationError) {
        console.log(`\n[VALIDATION FAILED] Attempt ${validationAttempts}: ${validationError}`);
        history.push({ role: 'model', parts: [{ text: response.text }] });
        text = validationError; // Send this as the new prompt for the next retry
        continue;
      }

      finalSuccess = true;
    }
    
    // We only process if finalSuccess is true
    let apiSuccess = finalSuccess;

    if (apiSuccess && data) {
      console.log('\n[FINAL ACTION]');
      console.log(`Reply generated with ${data.actions?.length || 0} actions`);

      // Save to memory
      history.push({ role: 'user', parts: [{ text }] });
      history.push({ role: 'model', parts: [{ text: response.text }] });

      // Apply operations to a local copy of the workspace
      let localWorkspace = [...currentWorkspace];

      (data.actions || []).forEach((action: any) => {
        if (action.type === 'add' && action.item) {
          let safePrice = Number(action.item.price);
          if (typeof action.item.price !== 'number' || Number.isNaN(safePrice)) {
            console.warn(`[INVALID_PRICE] Received invalid price for ${action.item.name}. Defaulting to 0.`);
            safePrice = 0;
          }
          localWorkspace.push({
            id: `${action.item.type}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            name: action.item.name,
            price: safePrice,
            type: action.item.type,
            productivityImpact: typeof action.item.productivityImpact === 'number' && !Number.isNaN(action.item.productivityImpact) ? action.item.productivityImpact : 0,
            ergonomicsImpact: typeof action.item.ergonomicsImpact === 'number' && !Number.isNaN(action.item.ergonomicsImpact) ? action.item.ergonomicsImpact : 0,
            designImpact: typeof action.item.designImpact === 'number' && !Number.isNaN(action.item.designImpact) ? action.item.designImpact : 0,
            position: [0, 0, 0], // Engine will resolve this
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          });
        } else if (action.type === 'remove' && action.itemId) {
          localWorkspace = localWorkspace.filter(i => i.id !== action.itemId);
        } else if (action.type === 'update' && action.itemId && action.item) {
          const index = localWorkspace.findIndex(i => i.id === action.itemId);
          if (index !== -1) {
            let safePrice = Number(action.item.price);
            if (typeof action.item.price !== 'number' || Number.isNaN(safePrice)) safePrice = 0;
            localWorkspace[index] = {
              ...localWorkspace[index],
              name: action.item.name || localWorkspace[index].name,
              price: safePrice,
              type: action.item.type || localWorkspace[index].type,
              productivityImpact: typeof action.item.productivityImpact === 'number' && !Number.isNaN(action.item.productivityImpact) ? action.item.productivityImpact : localWorkspace[index].productivityImpact,
              ergonomicsImpact: typeof action.item.ergonomicsImpact === 'number' && !Number.isNaN(action.item.ergonomicsImpact) ? action.item.ergonomicsImpact : localWorkspace[index].ergonomicsImpact,
              designImpact: typeof action.item.designImpact === 'number' && !Number.isNaN(action.item.designImpact) ? action.item.designImpact : localWorkspace[index].designImpact,
            };
          }
        } else if (action.type === 'clear_workspace') {
          localWorkspace = [];
        }
      });

      // Run Professional Layout Engine (AABB physics + layout constraints)
      const { resolvedWorkspace, validation } = resolveLayout(localWorkspace);
      
      if (validation.collisionCount > 0) {
        console.warn(`[LAYOUT_WARNING] Layout engine resolved with ${validation.collisionCount} collisions.`);
      }

      // Convert the final resolved state into a singular sync action for the client
      const formattedActions: { type: 'add' | 'update' | 'remove' | 'recommendation' | 'sync' | 'clear_workspace', item?: WorkspaceItem, itemId?: string, payload?: any, workspace?: WorkspaceItem[] }[] = [];
      
      if ((data.actions || []).some((a: any) => a.type === 'clear_workspace')) {
        formattedActions.push({ type: 'clear_workspace' });
      }
      formattedActions.push({ type: 'sync', workspace: resolvedWorkspace });

      // Stream the response back manually
      if (controller.signal.aborted) throw new Error('AbortError');
      const words = data.reply.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (controller.signal.aborted) throw new Error('AbortError');
        onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
        await new Promise(r => setTimeout(r, 40)); 
      }

      return {
        reply: data.reply,
        actions: formattedActions
      };
    } else {
      if (controller.signal.aborted) {
         console.log(`[ABORT] Request cancelled cleanly for socket ${socketId}`);
         throw new Error('AbortError');
      }
      
      // Local Heuristic Fallback
      console.log('\n[FALLBACK TRIGGERED]');
      console.log('TRUE');
      console.warn("[FALLBACK ACTIVATED] Executing local heuristic reasoning mode.");
      
      let fallbackText = "AI is currently busy analyzing your workspace. Please try again in a moment.";
      const localActions: any[] = [];
      const lowerText = text.toLowerCase();

      if (lowerText.includes('clear') || lowerText.includes('reset') || lowerText.includes('start over')) {
        fallbackText = "Workspace cleared locally.";
        localActions.push({ type: 'clear_workspace' });
      } else if (lowerText.includes('build') || lowerText.includes('create') || lowerText.includes('generate') || lowerText.includes('add')) {
        const itemCounts: Record<string, number> = {};
        
        const getQuantity = (regexStr: string, fallbackKeywords: string[], specialWords: Record<string, number> = {}): number => {
           const match = lowerText.match(new RegExp(`(\\d+)\\s*(?:${regexStr})`));
           if (match && match[1]) {
             return parseInt(match[1], 10);
           }
           for (const [word, count] of Object.entries(specialWords)) {
             if (lowerText.match(new RegExp(`${word}\\s*(?:${regexStr})`))) return count;
           }
           for (const keyword of fallbackKeywords) {
             if (lowerText.includes(keyword)) return 1;
           }
           return 0;
        };

        const desks = getQuantity('desk|table', ['desk', 'table']);
        const monitors = getQuantity('monitor|display', ['monitor', 'display'], {'dual': 2, 'two': 2, 'triple': 3, 'three': 3});
        const chairs = getQuantity('chair|seat', ['chair']);
        const keyboards = getQuantity('keyboard', ['keyboard']);
        const mice = getQuantity('mouse|mice', ['mouse']);
        const laptops = getQuantity('laptop|macbook', ['laptop', 'macbook'], {'two': 2});
        const pcs = getQuantity('pc|desktop|tower', ['pc', 'desktop', 'tower']);
        const tvs = getQuantity('tv|television', ['tv', 'television'], {'two': 2});
        const speakers = getQuantity('speaker|audio', ['speaker', 'audio'], {'two': 2});
        const webcams = getQuantity('webcam|camera', ['webcam', 'camera']);

        if (desks) { itemCounts['desk'] = desks; for(let i=0; i<desks; i++) localActions.push({ type: 'add', item: { type: 'desk', name: 'Standing Desk', price: 800 } }); }
        if (monitors) { itemCounts['monitor'] = monitors; for(let i=0; i<monitors; i++) localActions.push({ type: 'add', item: { type: 'monitor', name: 'Monitor', price: 600 } }); }
        if (chairs) { itemCounts['chair'] = chairs; for(let i=0; i<chairs; i++) localActions.push({ type: 'add', item: { type: 'chair', name: 'Ergonomic Chair', price: 1800 } }); }
        if (keyboards) { itemCounts['keyboard'] = keyboards; for(let i=0; i<keyboards; i++) localActions.push({ type: 'add', item: { type: 'keyboard', name: 'Mechanical Keyboard', price: 200 } }); }
        if (mice) { itemCounts['mouse'] = mice; for(let i=0; i<mice; i++) localActions.push({ type: 'add', item: { type: 'mouse', name: 'Wireless Mouse', price: 100 } }); }
        if (laptops) { itemCounts['laptop'] = laptops; for(let i=0; i<laptops; i++) localActions.push({ type: 'add', item: { type: 'laptop', name: 'Laptop', price: 2500 } }); }
        if (pcs) { itemCounts['desktop PC'] = pcs; for(let i=0; i<pcs; i++) localActions.push({ type: 'add', item: { type: 'box', name: 'Desktop PC', price: 3000 } }); }
        if (tvs) { itemCounts['TV'] = tvs; for(let i=0; i<tvs; i++) localActions.push({ type: 'add', item: { type: 'tv', name: 'OLED TV', price: 1500 } }); }
        if (speakers) { itemCounts['speaker'] = speakers; for(let i=0; i<speakers; i++) localActions.push({ type: 'add', item: { type: 'speakers', name: 'Studio Speaker', price: 300 } }); }
        if (webcams) { itemCounts['webcam'] = webcams; for(let i=0; i<webcams; i++) localActions.push({ type: 'add', item: { type: 'webcam', name: 'Webcam', price: 150 } }); }

        if (localActions.length === 0) {
           itemCounts['desk'] = 1; localActions.push({ type: 'add', item: { type: 'desk', name: 'Standing Desk', price: 800 } });
           itemCounts['chair'] = 1; localActions.push({ type: 'add', item: { type: 'chair', name: 'Ergonomic Chair', price: 1800 } });
           itemCounts['monitor'] = 1; localActions.push({ type: 'add', item: { type: 'monitor', name: 'Monitor', price: 600 } });
           itemCounts['laptop'] = 1; localActions.push({ type: 'add', item: { type: 'laptop', name: 'Laptop', price: 2500 } });
        }

        const itemsList = Object.entries(itemCounts).map(([name, count]) => {
          const pluralSuffix = name === 'TV' ? 's' : (name.endsWith('s') ? '' : 's');
          return `- ${count} ${name}${count > 1 ? pluralSuffix : ''}`;
        }).join('\n');
        
        fallbackText = `Created:\n${itemsList}`;
      } else if (currentWorkspace.length > 0) {
        if (lowerText.includes('weakest') || lowerText.includes('least')) {
          // Heuristic: Weakest item is the cheapest
          const weakest = [...currentWorkspace].sort((a, b) => a.price - b.price)[0];
          fallbackText = `Based on local analysis, the ${weakest.name} contributes the least productivity relative to cost and can be safely removed or upgraded.`;
        } else if (lowerText.includes('reduce') || lowerText.includes('remove') || lowerText.includes('save') || lowerText.includes('cheap') || lowerText.includes('budget')) {
          // Heuristic: Iteratively downgrade items until targetSavings is reached (or at least one item if no target)
          let totalSavings = 0;
          let iterations = 0;
          let itemsSortedByPrice = [...currentWorkspace].sort((a, b) => b.price - a.price);
          
          while (iterations < itemsSortedByPrice.length && (targetSavings === 0 || totalSavings < targetSavings)) {
            const item = itemsSortedByPrice[iterations];
            // Don't downgrade if explicitly protected (basic check)
            if (!lowerText.includes(`keep ${item.type}`) && !lowerText.includes(`don't remove ${item.type}`)) {
              const newPrice = Math.floor(item.price * 0.4); // 60% cheaper
              localActions.push({ type: 'update', itemId: item.id, item: { ...item, name: `Budget ${item.name}`, price: newPrice } });
              totalSavings += (item.price - newPrice);
            }
            iterations++;
            // If no targetSavings specified, just do the single most expensive item
            if (targetSavings === 0) break;
          }
          
          if (targetSavings > 0) {
            fallbackText = `Based on local analysis, we downgraded ${iterations} premium item(s) to budget alternatives, achieving a total savings of $${totalSavings} (Target: $${targetSavings}) while preserving your layout.`;
          } else {
            fallbackText = `Based on local analysis, replacing your premium ${itemsSortedByPrice[0]?.name} with a budget alternative will save you $${totalSavings} while preserving your layout.`;
          }
        } else if (lowerText.includes('improve') || lowerText.includes('upgrade')) {
           fallbackText = "Based on local analysis, upgrading your primary monitor or adding an ergonomic chair will provide the highest productivity gain.";
        } else {
           fallbackText = "Based on local analysis of your current workspace, adding a second monitor or ergonomic accessories will significantly boost productivity.";
        }
      } else {
        fallbackText = "AI generation is currently in fallback mode due to high traffic. Your workspace state has been preserved.";
      }
      
      // Stream fallback
      if (controller.signal.aborted) throw new Error('AbortError');
      const words = fallbackText.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (controller.signal.aborted) throw new Error('AbortError');
        onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
        await new Promise(r => setTimeout(r, 40)); 
      }
      
      let localWorkspace = [...currentWorkspace];
      localActions.forEach((action: any) => {
        if (action.type === 'add' && action.item) {
          let safePrice = Number(action.item.price);
          if (typeof action.item.price !== 'number' || Number.isNaN(safePrice)) {
            safePrice = 0;
          }
          localWorkspace.push({
            id: `${action.item.type}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            name: action.item.name,
            price: safePrice,
            type: action.item.type,
            productivityImpact: 10,
            ergonomicsImpact: 10,
            designImpact: 10,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          });
        } else if (action.type === 'remove' && action.itemId) {
          localWorkspace = localWorkspace.filter(i => i.id !== action.itemId);
        } else if (action.type === 'clear_workspace') {
          localWorkspace = [];
        }
      });

      const { resolvedWorkspace } = resolveLayout(localWorkspace);
      
      console.log(`[FALLBACK] Parsed ${localActions.length} actions`);
      console.log(`[FALLBACK] Layout generated with ${resolvedWorkspace.length} items`);
      console.log(`[FALLBACK] Workspace synced`);

      const formattedActions: any[] = [];
      if (localActions.some(a => a.type === 'clear_workspace')) {
        formattedActions.push({ type: 'clear_workspace' });
      }
      if (localActions.length > 0) {
        formattedActions.push({ type: 'sync', workspace: resolvedWorkspace });
      }

      return {
        reply: fallbackText,
        actions: formattedActions
      };
    } // End of else block
    } finally {
      // Clean up controller if it matches the current one
      if (this.activeControllers.get(socketId) === controller) {
        this.activeControllers.delete(socketId);
      }
    }
  }
}

export const aiService = new AIService();
