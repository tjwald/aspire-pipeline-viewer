
23:08:09 (pipeline-execution) → Starting pipeline-execution...
23:08:09 (diagnostics) → Starting diagnostics...
23:08:09 (diagnostics) i [INF] 
23:08:09 (diagnostics) i PIPELINE DEPENDENCY GRAPH DIAGNOSTICS
23:08:09 (diagnostics) i =====================================
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i This diagnostic output shows the complete pipeline dependency graph structure.
23:08:09 (diagnostics) i Use this to understand step relationships and troubleshoot execution issues.
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Total steps defined: 30
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Analysis for full pipeline execution (showing all steps and their relationships)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i EXECUTION ORDER
23:08:09 (diagnostics) i ===============
23:08:09 (diagnostics) i This shows the order in which steps would execute, respecting all dependencies.
23:08:09 (diagnostics) i Steps with no dependencies run first, followed by steps that depend on them.
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i   1. process-parameters
23:08:09 (diagnostics) i   2. build-prereq
23:08:09 (diagnostics) i   3. build-frontend
23:08:09 (diagnostics) i   4. build-app
23:08:09 (diagnostics) i   5. build
23:08:09 (diagnostics) i   6. install-uv-app
23:08:09 (diagnostics) i   7. install-app
23:08:09 (diagnostics) i   8. install-frontend
23:08:09 (diagnostics) i   9. install
23:08:09 (diagnostics) i  10. lint-lock-check-app
23:08:09 (diagnostics) i  11. lint-mypy-app
23:08:09 (diagnostics) i  12. lint-ruff-app
23:08:09 (diagnostics) i  13. lint-app
23:08:09 (diagnostics) i  14. lint-frontend
23:08:09 (diagnostics) i  15. lint
23:08:09 (diagnostics) i  16. setup-uv-python
23:08:09 (diagnostics) i  17. setup
23:08:09 (diagnostics) i  18. test-unit-app
23:08:09 (diagnostics) i  19. test-app
23:08:09 (diagnostics) i  20. test
23:08:09 (diagnostics) i  21. ci
23:08:09 (diagnostics) i  22. deploy
23:08:09 (diagnostics) i  23. deploy-prereq
23:08:09 (diagnostics) i  24. diagnostics
23:08:09 (diagnostics) i  25. publish
23:08:09 (diagnostics) i  26. publish-manifest
23:08:09 (diagnostics) i  27. publish-prereq
23:08:09 (diagnostics) i  28. push-prereq
23:08:09 (diagnostics) i  29. push-app
23:08:09 (diagnostics) i  30. push
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i DETAILED STEP ANALYSIS
23:08:09 (diagnostics) i ======================
23:08:09 (diagnostics) i Shows each step's dependencies, associated resources, tags, and descriptions.
23:08:09 (diagnostics) i ✓ = dependency exists, ? = dependency missing
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: build
23:08:09 (diagnostics) i     Description: Aggregation step for all build operations. All build steps should be required by this step.
23:08:09 (diagnostics) i     Dependencies: ✓ build-app, ✓ build-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: build-app
23:08:09 (diagnostics) i     Dependencies: ✓ build-frontend, ✓ build-prereq
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i     Tags: build-compute
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: build-frontend
23:08:09 (diagnostics) i     Dependencies: ✓ build-prereq
23:08:09 (diagnostics) i     Resource: frontend (ExecutableContainerResource)
23:08:09 (diagnostics) i     Tags: build-compute
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: build-prereq
23:08:09 (diagnostics) i     Description: Prerequisite step that runs before any build operations.
23:08:09 (diagnostics) i     Dependencies: ✓ process-parameters
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: ci
23:08:09 (diagnostics) i     Description: CI Pipeline
23:08:09 (diagnostics) i     Dependencies: ✓ install, ✓ lint, ✓ setup, ✓ test
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: deploy
23:08:09 (diagnostics) i     Description: Aggregation step for all deploy operations. All deploy steps should be required by this step.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: deploy-prereq
23:08:09 (diagnostics) i     Description: Prerequisite step that runs before any deploy operations. Initializes deployment environment and manages deployment state.
23:08:09 (diagnostics) i     Dependencies: ✓ process-parameters
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: diagnostics
23:08:09 (diagnostics) i     Description: Dumps dependency graph information for troubleshooting pipeline execution.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: install
23:08:09 (diagnostics) i     Dependencies: ✓ install-app, ✓ install-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: install-app
23:08:09 (diagnostics) i     Dependencies: ✓ install-uv-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: install-frontend
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i     Resource: frontend (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: install-uv-app
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint
23:08:09 (diagnostics) i     Dependencies: ✓ lint-app, ✓ lint-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint-app
23:08:09 (diagnostics) i     Dependencies: ✓ lint-lock-check-app, ✓ lint-mypy-app, ✓ lint-ruff-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint-frontend
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i     Resource: frontend (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint-lock-check-app
23:08:09 (diagnostics) i     Dependencies: ✓ install-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint-mypy-app
23:08:09 (diagnostics) i     Dependencies: ✓ install-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: lint-ruff-app
23:08:09 (diagnostics) i     Dependencies: ✓ install-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: process-parameters
23:08:09 (diagnostics) i     Description: Prompts for parameter values before build, publish, or deployment operations.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: publish
23:08:09 (diagnostics) i     Description: Aggregation step for all publish operations. All publish steps should be required by this step.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: publish-manifest
23:08:09 (diagnostics) i     Description: Publishes the Aspire application model as a JSON manifest file.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: publish-prereq
23:08:09 (diagnostics) i     Description: Prerequisite step that runs before any publish operations.
23:08:09 (diagnostics) i     Dependencies: ✓ process-parameters
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: push
23:08:09 (diagnostics) i     Description: Aggregation step for all push operations. All push steps should be required by this step.
23:08:09 (diagnostics) i     Dependencies: ✓ push-app, ✓ push-prereq
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: push-app
23:08:09 (diagnostics) i     Dependencies: ✓ build-app, ✓ build-app, ✓ push-prereq, ✓ push-prereq
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i     Tags: push-container-image
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: push-prereq
23:08:09 (diagnostics) i     Description: Prerequisite step that runs before any push operations.
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: setup
23:08:09 (diagnostics) i     Dependencies: ✓ setup-uv-python
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: setup-uv-python
23:08:09 (diagnostics) i     Dependencies: none
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: test
23:08:09 (diagnostics) i     Dependencies: ✓ test-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: test-app
23:08:09 (diagnostics) i     Dependencies: ✓ test-unit-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i Step: test-unit-app
23:08:09 (diagnostics) i     Dependencies: ✓ install-app
23:08:09 (diagnostics) i     Resource: app (ExecutableContainerResource)
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i POTENTIAL ISSUES:
23:08:09 (diagnostics) i Identifies problems in the pipeline configuration that could prevent execution.
23:08:09 (diagnostics) i ─────────────────
23:08:09 (diagnostics) i INFO: Orphaned steps (no dependencies, not required by others):
23:08:09 (diagnostics) i    - deploy
23:08:09 (diagnostics) i    - diagnostics
23:08:09 (diagnostics) i    - publish
23:08:09 (diagnostics) i    - publish-manifest
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i EXECUTION SIMULATION ("What If" Analysis):
23:08:09 (diagnostics) i Shows what steps would run for each possible target step and in what order.
23:08:09 (diagnostics) i Steps at the same level can run concurrently.
23:08:09 (diagnostics) i ─────────────────────────────────────────────────────────────────────────────
23:08:09 (diagnostics) i If targeting 'build':
23:08:09 (diagnostics) i   Direct dependencies: build-app, build-frontend
23:08:09 (diagnostics) i   Total steps: 5
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i     [2] build-frontend
23:08:09 (diagnostics) i     [3] build-app
23:08:09 (diagnostics) i     [4] build
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'build-app':
23:08:09 (diagnostics) i   Direct dependencies: build-frontend, build-prereq
23:08:09 (diagnostics) i   Total steps: 4
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i     [2] build-frontend
23:08:09 (diagnostics) i     [3] build-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'build-frontend':
23:08:09 (diagnostics) i   Direct dependencies: build-prereq
23:08:09 (diagnostics) i   Total steps: 3
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i     [2] build-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'build-prereq':
23:08:09 (diagnostics) i   Direct dependencies: process-parameters
23:08:09 (diagnostics) i   Total steps: 2
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'ci':
23:08:09 (diagnostics) i   Direct dependencies: install, lint, setup, test
23:08:09 (diagnostics) i   Total steps: 16
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-frontend | install-uv-app | lint-frontend | setup-uv-python (parallel)
23:08:09 (diagnostics) i     [1] install-app | setup (parallel)
23:08:09 (diagnostics) i     [2] install | lint-lock-check-app | lint-mypy-app | lint-ruff-app | test-unit-app (parallel)
23:08:09 (diagnostics) i     [3] lint-app | test-app (parallel)
23:08:09 (diagnostics) i     [4] lint | test (parallel)
23:08:09 (diagnostics) i     [5] ci
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'deploy':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] deploy
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'deploy-prereq':
23:08:09 (diagnostics) i   Direct dependencies: process-parameters
23:08:09 (diagnostics) i   Total steps: 2
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] deploy-prereq
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'diagnostics':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] diagnostics
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'install':
23:08:09 (diagnostics) i   Direct dependencies: install-app, install-frontend
23:08:09 (diagnostics) i   Total steps: 4
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-frontend | install-uv-app (parallel)
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] install
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'install-app':
23:08:09 (diagnostics) i   Direct dependencies: install-uv-app
23:08:09 (diagnostics) i   Total steps: 2
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'install-frontend':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'install-uv-app':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint':
23:08:09 (diagnostics) i   Direct dependencies: lint-app, lint-frontend
23:08:09 (diagnostics) i   Total steps: 8
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app | lint-frontend (parallel)
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] lint-lock-check-app | lint-mypy-app | lint-ruff-app (parallel)
23:08:09 (diagnostics) i     [3] lint-app
23:08:09 (diagnostics) i     [4] lint
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint-app':
23:08:09 (diagnostics) i   Direct dependencies: lint-lock-check-app, lint-mypy-app, lint-ruff-app
23:08:09 (diagnostics) i   Total steps: 6
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] lint-lock-check-app | lint-mypy-app | lint-ruff-app (parallel)
23:08:09 (diagnostics) i     [3] lint-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint-frontend':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] lint-frontend
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint-lock-check-app':
23:08:09 (diagnostics) i   Direct dependencies: install-app
23:08:09 (diagnostics) i   Total steps: 3
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] lint-lock-check-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint-mypy-app':
23:08:09 (diagnostics) i   Direct dependencies: install-app
23:08:09 (diagnostics) i   Total steps: 3
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] lint-mypy-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'lint-ruff-app':
23:08:09 (diagnostics) i   Direct dependencies: install-app
23:08:09 (diagnostics) i   Total steps: 3
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] lint-ruff-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'process-parameters':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'publish':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] publish
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'publish-manifest':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] publish-manifest
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'publish-prereq':
23:08:09 (diagnostics) i   Direct dependencies: process-parameters
23:08:09 (diagnostics) i   Total steps: 2
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters
23:08:09 (diagnostics) i     [1] publish-prereq
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'push':
23:08:09 (diagnostics) i   Direct dependencies: push-app, push-prereq
23:08:09 (diagnostics) i   Total steps: 7
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters | push-prereq (parallel)
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i     [2] build-frontend
23:08:09 (diagnostics) i     [3] build-app
23:08:09 (diagnostics) i     [4] push-app
23:08:09 (diagnostics) i     [5] push
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'push-app':
23:08:09 (diagnostics) i   Direct dependencies: build-app, build-app, push-prereq, push-prereq
23:08:09 (diagnostics) i   Total steps: 6
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] process-parameters | push-prereq (parallel)
23:08:09 (diagnostics) i     [1] build-prereq
23:08:09 (diagnostics) i     [2] build-frontend
23:08:09 (diagnostics) i     [3] build-app
23:08:09 (diagnostics) i     [4] push-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'push-prereq':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] push-prereq
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'setup':
23:08:09 (diagnostics) i   Direct dependencies: setup-uv-python
23:08:09 (diagnostics) i   Total steps: 2
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] setup-uv-python
23:08:09 (diagnostics) i     [1] setup
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'setup-uv-python':
23:08:09 (diagnostics) i   Direct dependencies: none
23:08:09 (diagnostics) i   Total steps: 1
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] setup-uv-python
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'test':
23:08:09 (diagnostics) i   Direct dependencies: test-app
23:08:09 (diagnostics) i   Total steps: 5
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] test-unit-app
23:08:09 (diagnostics) i     [3] test-app
23:08:09 (diagnostics) i     [4] test
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'test-app':
23:08:09 (diagnostics) i   Direct dependencies: test-unit-app
23:08:09 (diagnostics) i   Total steps: 4
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] test-unit-app
23:08:09 (diagnostics) i     [3] test-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i If targeting 'test-unit-app':
23:08:09 (diagnostics) i   Direct dependencies: install-app
23:08:09 (diagnostics) i   Total steps: 3
23:08:09 (diagnostics) i   Execution order:
23:08:09 (diagnostics) i     [0] install-uv-app
23:08:09 (diagnostics) i     [1] install-app
23:08:09 (diagnostics) i     [2] test-unit-app
23:08:09 (diagnostics) i 
23:08:09 (diagnostics) i 
23:08:10 (diagnostics) ✓ diagnostics completed successfully
23:08:10 (pipeline-execution) ✓ Completed successfully
------------------------------------------------------------
✓ 2/2 steps succeeded • Total time: 57.21ms

Steps Summary:
     40.71ms  ✓ pipeline-execution
     39.04ms  ✓ diagnostics

✓ PIPELINE SUCCEEDED
------------------------------------------------------------
