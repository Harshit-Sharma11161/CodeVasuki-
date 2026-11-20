import type { LanguageId } from './constants'

const FALLBACK: Record<LanguageId, string> = {
  python: `import sys

def solve(line: str) -> str:
    # Read one test case from "line" and return the answer as a string.
    return line

for raw in sys.stdin.read().splitlines():
    if raw.strip():
        print(solve(raw))
`,
  javascript: `const lines = require('fs').readFileSync(0, 'utf8').split('\\n');

function solve(line) {
  // Read one test case from "line" and return the answer as a string.
  return line;
}

for (const line of lines) {
  if (line.trim()) console.log(solve(line));
}
`,
  java: `import java.util.*;

public class Main {
    static String solve(String line) {
        // Read one test case from "line" and return the answer as a string.
        return line;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            if (!line.trim().isEmpty()) System.out.println(solve(line));
        }
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

string solve(const string& line) {
    // Read one test case from "line" and return the answer as a string.
    return line;
}

int main() {
    string line;
    while (getline(cin, line)) {
        if (!line.empty()) cout << solve(line) << "\\n";
    }
    return 0;
}
`,
  c: `#include <stdio.h>
#include <string.h>

int main(void) {
    char line[4096];
    while (fgets(line, sizeof(line), stdin)) {
        /* Parse the test case in "line" and print the answer. */
        printf("%s", line);
    }
    return 0;
}
`,
}

export function starterCodeFor(raw: string | null | undefined, language: LanguageId): string {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Record<LanguageId, string>>
      const value = parsed?.[language]
      if (typeof value === 'string' && value.trim()) return value
    } catch {
      // fall through to defaults
    }
  }
  return FALLBACK[language]
}

export function draftKey(problemId: string, language: string, battleId?: string | null) {
  return `cv:draft:${battleId ?? 'solo'}:${problemId}:${language}`
}