# Demonstration test cases

| Case | Input | Expected |
|---|---|---|
| Valid sender | `student@example.com` | Sender syntax accepted |
| Invalid sender | `student@` | Invalid sender rule contributes risk |
| Safe | “Lunch at noon tomorrow.” | SAFE absent other triggers |
| Suspicious | Urgent account verification request | Risk evidence and SUSPICIOUS or higher |
| Spam | Invalid sender, FREE winner, claim now, click here | SPAM |
| DFA accepted | `N S S S` | q0→q0→q1→q2→q3, accepted |
| DFA rejected | `S N S` | Final q1, rejected |
| Upload | .eml / .txt up to 1 MB | Plain-text analysis saved |
| Unsupported upload | .pdf | HTTP 400 |
