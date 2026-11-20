# Catopia known issues and risks

## Open items

| Priority | Issue / risk | Impact | Next action |
|---|---|---|---|
| High | No application or dependency manifest existed at initial audit | Product cannot currently run | Complete Stage 1 foundation and verify dependency installation/build |
| High | Campus/locality is unidentified and no verified map references were supplied | Accurate world/map cannot be authored | Obtain campus identity and verified landmark/boundary references before claiming geographic fidelity |
| High | No Supabase project or credentials are configured | Persistence, auth, storage and RLS cannot yet be exercised | Configure a development Supabase project through environment variables |
| Medium | No production assets or licenses were supplied | 3D environment and visual content cannot use approved downloaded assets yet | Acquire and inspect a coherent licensed set; record catalog, license and compatibility |
| Medium | Git metadata is absent | Change history and normal version-control workflow are unavailable | Initialize source control when appropriate for the project owner |
| Medium | No campus references or real cat photographs/data exist | No authentic cat records can be shown | Use an honest empty state until rights-cleared content is available |

## Verified observations

- No code, assets, configuration, dependency lockfile, tests, or existing documentation directory was found before this work.
- No bug in an existing application was observable because there was no application to run.
- No tests or external asset downloads have been claimed at this point.

Update this file as risks are resolved or defects are found; distinguish verified defects from planning dependencies.
