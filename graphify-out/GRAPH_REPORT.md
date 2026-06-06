# Graph Report - .  (2026-06-02)

## Corpus Check
- 175 files · ~175,777 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1062 nodes · 1652 edges · 74 communities (29 shown, 45 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Asistencia & Restaurant Operations|Asistencia & Restaurant Operations]]
- [[_COMMUNITY_Graphify BM25 Scripts|Graphify BM25 Scripts]]
- [[_COMMUNITY_Home Dashboard & POS|Home Dashboard & POS]]
- [[_COMMUNITY_Country & Customer Services|Country & Customer Services]]
- [[_COMMUNITY_Angular Package Dependencies|Angular Package Dependencies]]
- [[_COMMUNITY_Auth & Access Control|Auth & Access Control]]
- [[_COMMUNITY_Apertura  Gasto Module|Apertura / Gasto Module]]
- [[_COMMUNITY_App Routing & UI Widgets|App Routing & UI Widgets]]
- [[_COMMUNITY_Cierre de Dia  Caja|Cierre de Dia / Caja]]
- [[_COMMUNITY_Angular CLI Configuration|Angular CLI Configuration]]
- [[_COMMUNITY_Reportes & Cobro|Reportes & Cobro]]
- [[_COMMUNITY_Angular Build Architecture|Angular Build Architecture]]
- [[_COMMUNITY_Configuracion Service & Supabase|Configuracion Service & Supabase]]
- [[_COMMUNITY_Pedido Service|Pedido Service]]
- [[_COMMUNITY_Sales Widgets & Products|Sales Widgets & Products]]
- [[_COMMUNITY_Home Routes & Orders|Home Routes & Orders]]
- [[_COMMUNITY_Backend Node.js Package|Backend Node.js Package]]
- [[_COMMUNITY_Route Guards & Menu|Route Guards & Menu]]
- [[_COMMUNITY_Clientes Management|Clientes Management]]
- [[_COMMUNITY_Customer Service & Table UI|Customer Service & Table UI]]
- [[_COMMUNITY_Productos & Categorias|Productos & Categorias]]
- [[_COMMUNITY_Comprobante  SUNAT|Comprobante / SUNAT]]
- [[_COMMUNITY_UI Kit & Themes|UI Kit & Themes]]
- [[_COMMUNITY_Personal  Staff Management|Personal / Staff Management]]
- [[_COMMUNITY_Planilla  Payroll|Planilla / Payroll]]
- [[_COMMUNITY_Empresa Configuration|Empresa Configuration]]
- [[_COMMUNITY_Toppings Module|Toppings Module]]
- [[_COMMUNITY_Vouchers Management|Vouchers Management]]
- [[_COMMUNITY_Menu & Perfil Permisos|Menu & Perfil Permisos]]
- [[_COMMUNITY_Design Skills Cluster|Design Skills Cluster]]
- [[_COMMUNITY_TypeScript Interfaces & Models|TypeScript Interfaces & Models]]
- [[_COMMUNITY_Angular Forms & Reactive Forms|Angular Forms & Reactive Forms]]
- [[_COMMUNITY_PrimeNG UI Components|PrimeNG UI Components]]
- [[_COMMUNITY_SCSS Styles & Theming|SCSS Styles & Theming]]
- [[_COMMUNITY_Supabase Auth & Session|Supabase Auth & Session]]
- [[_COMMUNITY_Navigation & Sidebar|Navigation & Sidebar]]
- [[_COMMUNITY_Dialog & Modal Management|Dialog & Modal Management]]
- [[_COMMUNITY_HTTP Interceptors|HTTP Interceptors]]
- [[_COMMUNITY_Error Handling|Error Handling]]
- [[_COMMUNITY_Date & Time Utilities|Date & Time Utilities]]
- [[_COMMUNITY_Image Assets|Image Assets]]
- [[_COMMUNITY_i18n & Localization|i18n & Localization]]
- [[_COMMUNITY_User Preferences|User Preferences]]
- [[_COMMUNITY_Print & PDF Generation|Print & PDF Generation]]
- [[_COMMUNITY_Tax & SUNAT Integration|Tax & SUNAT Integration]]
- [[_COMMUNITY_Inventory Management|Inventory Management]]
- [[_COMMUNITY_Order Tracking|Order Tracking]]
- [[_COMMUNITY_Payment Processing|Payment Processing]]
- [[_COMMUNITY_Notification & Toast|Notification & Toast]]
- [[_COMMUNITY_Search & Autocomplete|Search & Autocomplete]]
- [[_COMMUNITY_Charts & Analytics|Charts & Analytics]]
- [[_COMMUNITY_Environment Config|Environment Config]]
- [[_COMMUNITY_Deployment & CI|Deployment & CI]]
- [[_COMMUNITY_API Gateway|API Gateway]]
- [[_COMMUNITY_GraphQL Queries|GraphQL Queries]]
- [[_COMMUNITY_File Upload|File Upload]]
- [[_COMMUNITY_Calendar & Scheduling|Calendar & Scheduling]]
- [[_COMMUNITY_Table & DataGrid|Table & DataGrid]]
- [[_COMMUNITY_Permission Management|Permission Management]]
- [[_COMMUNITY_Branding & Logo|Branding & Logo]]
- [[_COMMUNITY_License & Legal|License & Legal]]
- [[_COMMUNITY_README & Documentation|README & Documentation]]
- [[_COMMUNITY_Skill Docs Image Gen|Skill Docs: Image Gen]]
- [[_COMMUNITY_Skill Docs Redesign|Skill Docs: Redesign]]
- [[_COMMUNITY_Skill Docs Stitch Design|Skill Docs: Stitch Design]]
- [[_COMMUNITY_Skill Docs Brandkit|Skill Docs: Brandkit]]
- [[_COMMUNITY_Skill Docs UI UX Pro Max|Skill Docs: UI UX Pro Max]]

## God Nodes (most connected - your core abstractions)
1. `HomeComponent` - 91 edges
2. `SupabaseService` - 55 edges
3. `PedidoService` - 33 edges
4. `CajaComponent` - 31 edges
5. `ReportesComponent` - 29 edges
6. `AuthService` - 28 edges
7. `MenuService` - 27 edges
8. `ProductService` - 27 edges
9. `LayoutService` - 25 edges
10. `AperturaService` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Logo Management Guide` --references--> `Angular Restaurant Management System`  [INFERRED]
  LOGO_MANAGEMENT.md → README.md
- `Home Dashboard Component` --references--> `Restaurant Logo`  [INFERRED]
  src/app/pages/modules/home/home.component.html → src/assets/img/logo.png
- `Minimalist UI Skill` --semantically_similar_to--> `High End Visual Design Skill`  [INFERRED] [semantically similar]
  .agent/skills/minimalist-ui/SKILL.md → .agent/skills/high-end-visual-design/SKILL.md
- `Image Gen Frontend Web Skill` --semantically_similar_to--> `Image Gen Frontend Mobile Skill`  [INFERRED] [semantically similar]
  .agent/skills/imagegen-frontend-web/SKILL.md → .agent/skills/imagegen-frontend-mobile/SKILL.md
- `Configuracion Hub Component` --references--> `Usuario Management Component`  [INFERRED]
  src/app/pages/modules/configuracion/configuracion.component.html → src/app/pages/modules/configuracion/administracion/usuario.component.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Frontend Design Skills Cluster** — brandkit_skill_brandkit, design_taste_frontend_skill, high_end_visual_design_skill, imagegen_frontend_web_skill, minimalist_ui_skill, ui_ux_pro_max_skill [INFERRED 0.85]
- **Restaurant Operations Modules** — apertura_apertura_component, caja_caja_component, comprobante_emitir_comprobante_component, asistencia_asistencia_component [INFERRED 0.85]
- **Configuration CRUD Modules** — administracion_usuario_component_usuarios_module, clientes_clientes_component_clientes_module, personal_personal_component, productos_productos_component, toppings_toppings_component [INFERRED 0.85]

## Communities (74 total, 45 thin omitted)

### Community 0 - "Asistencia & Restaurant Operations"
Cohesion: 0.05
Nodes (10): Angular Restaurant Management System, AsistenciaComponent, PlanillaComponent, RegistroPlanilla, Asistencia, AsistenciaResult, AsistenciaService, AuthService (+2 more)

### Community 1 - "Graphify BM25 Scripts"
Cohesion: 0.06
Nodes (42): bool, BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts (+34 more)

### Community 3 - "Country & Customer Services"
Cohesion: 0.05
Nodes (13): CountryService, Country, NodeService, ButtonDemo, FileDemo, FormLayoutDemo, InputDemo, MenuDemo (+5 more)

### Community 4 - "Angular Package Dependencies"
Cohesion: 0.05
Nodes (41): dependencies, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+33 more)

### Community 5 - "Auth & Access Control"
Cohesion: 0.08
Nodes (11): Access, Error, Login, AppFloatingConfigurator, EmpresaComponent, environment, Home Dashboard Component, Restaurant Logo (+3 more)

### Community 6 - "Apertura / Gasto Module"
Cohesion: 0.06
Nodes (4): AperturaComponent, Cierre Dia / Caja Component, EmitirComprobanteComponent, AperturaService

### Community 7 - "App Routing & UI Widgets"
Cohesion: 0.07
Nodes (17): appRoutes, BestSellingWidget, FeaturesWidget, FooterWidget, HeroWidget, HighlightsWidget, NotificationsWidget, PricingWidget (+9 more)

### Community 8 - "Cierre de Dia / Caja"
Cohesion: 0.08
Nodes (3): CajaComponent, Caja, CajaService

### Community 9 - "Angular CLI Configuration"
Cohesion: 0.05
Nodes (38): cli, analytics, newProjectRoot, projects, sakai-ng, prefix, projectType, root (+30 more)

### Community 10 - "Reportes & Cobro"
Cohesion: 0.08
Nodes (6): ReportesComponent, ES_LOCALE, getCurrentUserPerfilId(), hasPerfilPermission(), isUserLoggedIn(), validateSession()

### Community 11 - "Angular Build Architecture"
Cohesion: 0.08
Nodes (33): build, extract-i18n, serve, test, builder, configurations, defaultConfiguration, options (+25 more)

### Community 14 - "Sales Widgets & Products"
Cohesion: 0.13
Nodes (5): RecentSalesWidget, InventoryStatus, Product, ListDemo, OverlayDemo

### Community 15 - "Home Routes & Orders"
Cohesion: 0.18
Nodes (5): Mesa, Pedido, Products, OrderByPipe, UniquePipe

### Community 16 - "Backend Node.js Package"
Cohesion: 0.11
Nodes (17): author, dependencies, body-parser, cors, dotenv, express, mysql2, pg (+9 more)

### Community 19 - "Customer Service & Table UI"
Cohesion: 0.17
Nodes (4): Customer, Representative, expandedRows, TableDemo

### Community 24 - "Planilla / Payroll"
Cohesion: 0.35
Nodes (5): Usuario Management Component, Clientes Management Component, Configuracion Hub Component, ImportsModule, VoucherDisplay

### Community 32 - "PrimeNG UI Components"
Cohesion: 0.20
Nodes (3): Perfil, Usuario, PerfilPermisosComponent

### Community 37 - "HTTP Interceptors"
Cohesion: 0.22
Nodes (8): bracketSameLine, overrides, printWidth, semi, singleQuote, tabWidth, trailingComma, useTabs

### Community 40 - "Image Assets"
Cohesion: 0.25
Nodes (5): KeyOfType, presets, SurfacesType, LayoutState, MenuChangeEvent

### Community 46 - "Inventory Management"
Cohesion: 0.33
Nodes (6): Brandkit Skill, High End Visual Design Skill, Minimalist UI Skill, Premium Frontend Design Pattern, Redesign Existing Projects Skill, UI UX Pro Max Skill

### Community 49 - "Notification & Toast"
Cohesion: 0.33
Nodes (5): assetsImgPath, fs, logoFilePath, path, projectRoot

### Community 54 - "Deployment & CI"
Cohesion: 0.50
Nodes (3): args, fs, path

## Knowledge Gaps
- **159 isolated node(s):** `bool`, `useTabs`, `tabWidth`, `trailingComma`, `semi` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HomeComponent` connect `Home Dashboard & POS` to `Country & Customer Services`, `Dialog & Modal Management`, `App Routing & UI Widgets`, `Angular Modules Registry`, `User Preferences`, `Home Routes & Orders`, `Shared Utilities`, `Environment Config`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `CajaComponent` connect `Cierre de Dia / Caja` to `Toppings Module`, `App Routing & UI Widgets`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `ReportesComponent` connect `Reportes & Cobro` to `Country & Customer Services`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Asistencia & Restaurant Operations` be split into smaller, more focused modules?**
  _Cohesion score 0.05389610389610389 - nodes in this community are weakly interconnected._
- **Should `Graphify BM25 Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05974025974025974 - nodes in this community are weakly interconnected._
- **Should `Home Dashboard & POS` be split into smaller, more focused modules?**
  _Cohesion score 0.04025974025974026 - nodes in this community are weakly interconnected._