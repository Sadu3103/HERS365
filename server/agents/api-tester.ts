import fetch from 'node-fetch';

export interface TestResult { endpoint: string; method: string; status: number; passed: boolean; duration: number; }
export interface TestSuite { name: string; tests: TestResult[]; passed: number; failed: number; }

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

export class EndpointTester {
  private baseUrl: string;
  constructor(baseUrl = BASE_URL) { this.baseUrl = baseUrl; }
  async testEndpoint(method: string, path: string): Promise<TestResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.baseUrl + path, { method });
      return { endpoint: path, method, status: res.status, passed: res.ok, duration: Date.now() - start };
    } catch (e: any) {
      return { endpoint: path, method, status: 0, passed: false, duration: Date.now() - start };
    }
  }
}

export class RegressionTester {
  async runRegressionTests(): Promise<TestSuite> {
    console.log('[RegressionTester] Running...');
    const tester = new EndpointTester();
    const tests = await Promise.all([
      tester.testEndpoint('GET', '/api/health'),
      tester.testEndpoint('GET', '/api/players'),
      tester.testEndpoint('GET', '/api/teams')
    ]);
    return { name: 'Regression Suite', tests, passed: tests.filter(t => t.passed).length, failed: tests.filter(t => !t.passed).length };
  }
}

export class APITestingOrchestrator {
  async runFullTestSuite(): Promise<{ regression: TestSuite }> {
    console.log('[APITesting] Running...');
    const regression = await new RegressionTester().runRegressionTests();
    return { regression };
  }
  start(): void { console.log('[APITesting] Started'); }
  stop(): void { }
}