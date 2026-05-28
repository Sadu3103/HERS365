// H.E.R.S.365 AI Agents Index
// Orchestrates all 4 types of AI agents for comprehensive monitoring and testing

export { WebScraperOrchestrator } from './web-scraper.js';
export { CodeAnalysisOrchestrator } from './code-analyzer.js';
export { RuntimeMonitorOrchestrator } from './runtime-monitor.js';
export { APITestingOrchestrator } from './api-tester.js';

import { WebScraperOrchestrator } from './web-scraper.js';
import { CodeAnalysisOrchestrator } from './code-analyzer.js';
import { RuntimeMonitorOrchestrator } from './runtime-monitor.js';
import { APITestingOrchestrator } from './api-tester.js';

export interface AgentStatus {
  webScraper: { running: boolean };
  codeAnalyzer: { running: boolean };
  runtimeMonitor: { running: boolean };
  apiTester: { running: boolean };
  timestamp: string;
}

class AgentOrchestrator {
  private webScraper = new WebScraperOrchestrator();
  private codeAnalyzer = new CodeAnalysisOrchestrator();
  private runtimeMonitor = new RuntimeMonitorOrchestrator();
  private apiTester = new APITestingOrchestrator();

  constructor() {
    console.log('[AgentOrchestrator] Initializing all agents...');
  }

  startAll(config?: { codePath?: string }): void {
    console.log('[AgentOrchestrator] Starting all agents...');
    this.webScraper.start();
    if (config?.codePath) {
      this.codeAnalyzer.runFullAnalysis(config.codePath);
    }
    this.runtimeMonitor.start();
    this.apiTester.start();
    console.log('[AgentOrchestrator] All agents started');
  }

  stopAll(): void {
    console.log('[AgentOrchestrator] Stopping all agents...');
    this.webScraper.stop();
    this.codeAnalyzer.stop();
    this.runtimeMonitor.stop();
    this.apiTester.stop();
  }

  getStatus(): AgentStatus {
    return {
      webScraper: this.webScraper.getStatus(),
      codeAnalyzer: { running: false },
      runtimeMonitor: { running: false },
      apiTester: { running: false },
      timestamp: new Date().toISOString()
    };
  }
}

const agentOrchestrator = new AgentOrchestrator();
export default agentOrchestrator;