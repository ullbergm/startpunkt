# Changelog

## [5.8.0](https://github.com/ullbergm/startpunkt/compare/v5.7.0...v5.8.0) (2026-11-14)


### Features

* **github-action:** update actions/upload-artifact action to v7.0.2 ([#973](https://github.com/ullbergm/startpunkt/issues/973)) ([c6e99ac](https://github.com/ullbergm/startpunkt/commit/c6e99ac78961fb58c6124f181972b80cb7bd872c))

## [5.7.0](https://github.com/ullbergm/startpunkt/compare/v5.6.0...v5.7.0) (2026-11-14)


### Features

* add tile diagnostics, source presets and resilient deployment defaults ([24f3d43](https://github.com/ullbergm/startpunkt/commit/24f3d4319f67726d453206e1e195b5de4cae04c2))
* **controller:** elect a leader for probes and status writes ([9b040ce](https://github.com/ullbergm/startpunkt/commit/9b040ce1d1059fe4166bdda2f81cf8d8623461d3))
* **editor:** preview and override inherited secondary links ([c875618](https://github.com/ullbergm/startpunkt/commit/c875618b3979cd17662aaabb84e8b76d36be7332))
* **metrics:** add Prometheus monitoring and OpenShift Grafana dashboards ([7658199](https://github.com/ullbergm/startpunkt/commit/7658199513fec1b8efaae0e9c6f2e31ade01545e))
* **remotes:** show last contact and stale duration ([b7fa134](https://github.com/ullbergm/startpunkt/commit/b7fa1349c48eb8183d2d2fdbc8946bbff8079e78))
* **search:** match ordered characters in service names ([f108161](https://github.com/ullbergm/startpunkt/commit/f108161db5601b5b85f6ce08183a1d845e8c5107))
* **sources:** add Traefik and Contour CEL presets ([86b18da](https://github.com/ullbergm/startpunkt/commit/86b18da0a3828d2a98645df603fc496b2e2f688d))
* **tiles:** add named secondary links ([276cefb](https://github.com/ullbergm/startpunkt/commit/276cefb64ddfdd12440611dc6a1f7e3c3fc2c611))
* **workloads:** show readiness and OpenShift resource links ([6dc1b0c](https://github.com/ullbergm/startpunkt/commit/6dc1b0c5c050d561c01757362e26458d4553cd71))


### Bug Fixes

* **api:** clarify availability probe timestamp semantics ([bd90197](https://github.com/ullbergm/startpunkt/commit/bd901975bea79e1e62fe3f9e8c4ba1b4fad8a130))
* **chart:** validate all chart values and reject misspelled keys ([d7a89da](https://github.com/ullbergm/startpunkt/commit/d7a89dae3682d07c7bfe951bb43aa0b089f6eba4))
* **config:** preserve cluster identity across split roles ([9fdde88](https://github.com/ullbergm/startpunkt/commit/9fdde885aca044334dae3e4c61c4b92dfbd462ff))
* **controller:** discard mutations from retired informers ([5d5f7bf](https://github.com/ullbergm/startpunkt/commit/5d5f7bf7661342995bf742b1bc8072c9ea60a8fc))
* **controller:** rebuild cluster state without losing readiness ([922e24b](https://github.com/ullbergm/startpunkt/commit/922e24be1b054a864954efe19af4515466dea1be))
* **editing:** reject saves from stale resource versions ([c80a5db](https://github.com/ullbergm/startpunkt/commit/c80a5dbf96fe433fd3dd4bff7cfdcd4ab644a236))
* **editor:** allow saves after status-only updates ([016d5a8](https://github.com/ullbergm/startpunkt/commit/016d5a8e1a051e55fb1a9f642f72289b6a0502d6))
* **federation:** bound and validate upstream event streams ([895f15c](https://github.com/ullbergm/startpunkt/commit/895f15cf1118f600f7ef048329a65ea4801ce214))
* **federation:** protect secret headers across redirects ([8f204f1](https://github.com/ullbergm/startpunkt/commit/8f204f125180e7eeefdc2627e54ccb35678255f5))
* **federation:** retain tiles while remote identity changes ([107d416](https://github.com/ullbergm/startpunkt/commit/107d4168d3340bcad53fac0b1c1d120c29f5906e))
* **icons:** bound pending requests and reject overload ([f851349](https://github.com/ullbergm/startpunkt/commit/f851349441eec5631589b8cd5097a63973e0d2ca))
* **icons:** synchronize cache result publication ([f36b59f](https://github.com/ullbergm/startpunkt/commit/f36b59f68dce5c9adfceb6fcbe95213ba6dda00b))
* **kube:** retry references when their resource kind appears ([ef3f648](https://github.com/ullbergm/startpunkt/commit/ef3f648d9b3206484328df4e7bf2f98d92d3d23b))
* **sources:** validate all tile URLs on the server ([bf10cdc](https://github.com/ullbergm/startpunkt/commit/bf10cdc4a7c766833ce5feed6b3101195a2df568))
* **status:** retry transient application status failures ([381e5dd](https://github.com/ullbergm/startpunkt/commit/381e5ddddc564309dee36bf3a55e50a5631db3f9))
* **web:** follow system theme in auto mode with background panels ([dc4349c](https://github.com/ullbergm/startpunkt/commit/dc4349ca86c929c68098fd65337a0fcf3856e5a8))
* **web:** give each tile group a unique accessible label ([741872d](https://github.com/ullbergm/startpunkt/commit/741872d0fb8131aef0ae25e9069637a70e258b20))
* **web:** preserve combined tile favorites and ordering ([960a891](https://github.com/ullbergm/startpunkt/commit/960a891ed1a59637afdf79c0ddbbb054180d3dc8))

## [5.6.0](https://github.com/ullbergm/startpunkt/compare/v5.5.0...v5.6.0) (2026-11-13)


### Features

* **web:** ask for the edit key when edit mode is entered ([#970](https://github.com/ullbergm/startpunkt/issues/970)) ([bb179a3](https://github.com/ullbergm/startpunkt/commit/bb179a3054335e92c8951364905c2efcaeefa775))

## [5.5.0](https://github.com/ullbergm/startpunkt/compare/v5.4.0...v5.5.0) (2026-11-13)


### Features

* check what is typed into the editor and say whether the address answers ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* let the instance set the page's default settings ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** announce a newer release on a ribbon across the corner, and not in the footer ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** centre the slider of the panel behind the content ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** draw the controls of the dialogs with daisyUI ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** drop the spacing and compact tiles settings ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** in edit mode, box every tile and make a click open its form or say why it cannot be changed ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** pick groups, tags, icons and colours in the editor ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** put the footer right under the content ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))
* **web:** remove the corner that linked to GitHub; web.githubLink now shows or hides the footer ([dc97788](https://github.com/ullbergm/startpunkt/commit/dc977885d06756da079fda77d621a25e4196db31))

## [5.4.0](https://github.com/ullbergm/startpunkt/compare/v5.3.0...v5.4.0) (2026-11-13)


### Features

* **federation:** add insecureSkipVerify to a remote ([#964](https://github.com/ullbergm/startpunkt/issues/964)) ([e2c7fba](https://github.com/ullbergm/startpunkt/commit/e2c7fba4c267bc5def12e35bd5128e3e50b28d12))


### Bug Fixes

* lay out the form dialogs properly and leave what Helm deploys read-only ([#966](https://github.com/ullbergm/startpunkt/issues/966)) ([e5b5a6f](https://github.com/ullbergm/startpunkt/commit/e5b5a6f296e6dd348923a520201ba62732aed47e))

## [5.3.0](https://github.com/ullbergm/startpunkt/compare/v5.2.0...v5.3.0) (2026-11-13)


### Features

* show what changed after an update and for a newer release ([#962](https://github.com/ullbergm/startpunkt/issues/962)) ([44b2993](https://github.com/ullbergm/startpunkt/commit/44b299379d51c09f6092e31edf869cbe037011d5))

## [5.2.0](https://github.com/ullbergm/startpunkt/compare/v5.1.0...v5.2.0) (2026-11-13)


### Features

* **web:** add an edit mode and leave what Argo CD deploys read-only ([#960](https://github.com/ullbergm/startpunkt/issues/960)) ([e3ac835](https://github.com/ullbergm/startpunkt/commit/e3ac83503f1841bd509662dacaaeafb0beb5435c))

## [5.1.0](https://github.com/ullbergm/startpunkt/compare/v5.0.1...v5.1.0) (2026-11-13)


### Features

* **web:** add colour schemes and give presets a tab of their own ([#958](https://github.com/ullbergm/startpunkt/issues/958)) ([49ec96b](https://github.com/ullbergm/startpunkt/commit/49ec96b67f77803d9e612ddb10c0979b22c9fe66))

## [5.0.1](https://github.com/ullbergm/startpunkt/compare/v5.0.0...v5.0.1) (2026-11-12)


### Bug Fixes

* **api:** settle every waiting icon exactly once ([#955](https://github.com/ullbergm/startpunkt/issues/955)) ([70dadf1](https://github.com/ullbergm/startpunkt/commit/70dadf17b4d5c33c29dbaa1e327ee2ba68c5287c))
* **web:** keep the settings dialog one height across tabs ([#957](https://github.com/ullbergm/startpunkt/issues/957)) ([7dc7faf](https://github.com/ullbergm/startpunkt/commit/7dc7faf8d7a800856bb753614f3e4c183394b951))

## [5.0.0](https://github.com/ullbergm/startpunkt/compare/v4.8.0...v5.0.0) (2026-11-12)


### ⚠ BREAKING CHANGES

* Startpunkt v5, a rewrite in Go ([#949](https://github.com/ullbergm/startpunkt/issues/949))

### Features

* Startpunkt v5, a rewrite in Go ([#949](https://github.com/ullbergm/startpunkt/issues/949)) ([a20b636](https://github.com/ullbergm/startpunkt/commit/a20b6367dfc9a40ddcd4bf759230f6aa4901d57b))

### Continuous Integration

* prepare releases with release-please ([7d8fdb9](https://github.com/ullbergm/startpunkt/commit/7d8fdb99389099a0ac7ccee454acc10a02fb40b8))
