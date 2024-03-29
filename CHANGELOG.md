# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.16](https://github.com/uboness/homebridge-dirigera/compare/v0.1.15...v0.1.16) (2024-03-08)


### Features

* Added support for `LeakSensor` (BADRING) ([adb0a8e](https://github.com/uboness/homebridge-dirigera/commit/adb0a8e8e733277221b61b8e8a648ecc41d8cdee))

## [0.1.15](https://github.com/uboness/homebridge-dirigera/compare/v0.1.14...v0.1.15) (2024-01-24)

## [0.1.14](https://github.com/uboness/homebridge-dirigera/compare/v0.1.13...v0.1.14) (2024-01-24)


### Features

* Added support for `ContactSensor`, `MotionSensor`, and `Outlet` ([dca60f5](https://github.com/uboness/homebridge-dirigera/commit/dca60f56d8260840d9fa6b6f33446bb05999d893))

## [0.1.13](https://github.com/uboness/homebridge-dirigera/compare/v0.1.12...v0.1.13) (2024-01-08)


### Bug Fixes

* **cleanup:** removed package-lock.json in favour of pnpm-lock.yaml ([ae0722a](https://github.com/uboness/homebridge-dirigera/commit/ae0722a95de5d0e6ee8e069d5779dc0415a0597b))

## [0.1.12](https://github.com/uboness/homebridge-dirigera/compare/v0.1.11...v0.1.12) (2024-01-08)


### Bug Fixes

* **auth:** instead of prompting the user to press "Enter" (LOL), the authentication process is now attempted 12 times (5 seconds between each attempt), giving the user 1 min to press the action button on the hub. After 1 min the authentication fails and the hub will be skipped ([d51c5f0](https://github.com/uboness/homebridge-dirigera/commit/d51c5f001672135f705a8865190097449e4f2939))

## [0.1.11](https://github.com/uboness/homebridge-dirigera/compare/v0.1.10...v0.1.11) (2023-12-12)


### Bug Fixes

* **schema:** added missing config schema file ([25a1100](https://github.com/uboness/homebridge-dirigera/commit/25a1100eae5b9a42ae35ecea0c709f5b7dcde879))

## [0.1.10](https://github.com/uboness/homebridge-dirigera/compare/v0.1.9...v0.1.10) (2023-12-12)

## [0.1.9](https://github.com/uboness/homebridge-dirigera/compare/v0.1.8...v0.1.9) (2023-12-12)

## [0.1.8](https://github.com/uboness/homebridge-dirigera/compare/v0.1.7...v0.1.8) (2023-12-12)

## [0.1.7](https://github.com/uboness/homebridge-dirigera/compare/v0.1.6...v0.1.7) (2023-12-12)

## [0.1.6](https://github.com/uboness/homebridge-dirigera/compare/v0.1.5...v0.1.6) (2023-12-12)

## [0.1.5](https://github.com/uboness/homebridge-dirigera/compare/v0.1.4...v0.1.5) (2023-12-12)

## [0.1.4](https://github.com/uboness/homebridge-dirigera/compare/v0.1.3...v0.1.4) (2023-12-12)

## [0.1.3](https://github.com/uboness/homebridge-dirigera/compare/v0.1.2...v0.1.3) (2023-12-12)

## [0.1.2](https://github.com/uboness/homebridge-dirigera/compare/v0.1.1...v0.1.2) (2023-12-12)


### Bug Fixes

* **dist:** Fixed `package.json` and removed unused files ([4f9bd31](https://github.com/uboness/homebridge-dirigera/commit/4f9bd31811d5cdf1e8a89e9ecdcefb41db1207e9))
* **git:** cleaned up git templates ([b5be71e](https://github.com/uboness/homebridge-dirigera/commit/b5be71e7e3ba1a78511a00ca7b6ef7a0cee83ab1))

## 0.1.1 (2023-12-12)
