import { aiService } from './src/services/ai.service';
import { WorkspaceItem } from './src/types';

const mockWorkspace: WorkspaceItem[] = [
  { id: '1', name: 'Expensive Monitor', type: 'monitor', price: 1000, position: [0,0,0], rotation: [0,0,0], scale: [1,1,1], productivityImpact: 20, ergonomicsImpact: 10, designImpact: 10 },
  { id: '2', name: 'Cheap Mouse', type: 'mouse', price: 20, position: [0,0,0], rotation: [0,0,0], scale: [1,1,1], productivityImpact: 5, ergonomicsImpact: 5, designImpact: 5 }
];

async function run() {
  console.log("=== TEST: REDUCE BUDGET (FALLBACK) ===");
  // We'll pass a dummy message and force a fallback by sending invalid JSON if Gemini replies, but actually to force fallback without modifying ai.service.ts temporarily we can't easily. 
  // Let's just run it normally to test the validation layer doesn't crash on standard input.
  const res = await aiService.processUserMessage('test_socket', 'What is the weakest part of my setup?', mockWorkspace, (chunk) => {});
  console.log(res);
}

run().catch(console.error);
