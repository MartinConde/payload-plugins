export { NavShell } from '../features/nav/NavShell.js';
/* Server-side serializer for an upload collection's metadata, consumed by the
   client `UploadFieldInput` (its "Upload new" dialog renders the target
   collection's non-file fields). */ export { extractCollection } from 'payload-plugin-shadcn-ui';
export { CollectionListView } from '../features/list-view/CollectionListView.js';
export { AutoCollectionListView } from '../features/list-view/AutoCollectionListView.js';
export { AutoCollectionDocView } from '../features/doc-form/AutoCollectionDocView.js';
export { AutoVersionsView } from '../features/doc-form/versions/AutoVersionsView.js';
export { AutoVersionView } from '../features/doc-form/versions/AutoVersionView.js';
export { AutoApiView } from '../features/doc-form/api/AutoApiView.js';
export { default as DefaultNav } from '../features/nav/DefaultNav.js';
/* Root-level Account + auth views (installed by the `defaultAuthViews` option
   at `admin.components.views.<key>`). `reset` and `verify` are intentionally
   absent — they aren't cleanly overridable in Payload 3.84.1. */ export { AutoAccountView } from '../features/account/AutoAccountView.js';
export { AutoLoginView } from '../features/auth/AutoLoginView.js';
export { AutoCreateFirstUserView } from '../features/auth/AutoCreateFirstUserView.js';
export { AutoForgotPasswordView } from '../features/auth/AutoForgotPasswordView.js';
export { AutoLogoutView, AutoLogoutInactivityView } from '../features/auth/AutoLogoutView.js';
export { AutoUnauthorizedView } from '../features/auth/AutoUnauthorizedView.js';
/* Folder views (installed by the `defaultFolderView` option at
   `admin.components.views.browseByFolder`). */ export { AutoBrowseByFolderView } from '../features/folder-view/AutoBrowseByFolderView.js';
/* Root dashboard (installed by the `defaultDashboard` option at
   `admin.components.views.dashboard`). */ export { AutoDashboardView } from '../features/dashboard/AutoDashboardView.js';
