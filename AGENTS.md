# Project architecture rules

- Keep student verification requests in a dedicated private table instead of `profiles`, and enforce verified-only Posts participation with database policies so roll numbers stay private and the restriction cannot be bypassed in the interface.