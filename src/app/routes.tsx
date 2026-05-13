import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        lazy: async () => {
          const { Home } = await import("./pages/Home");
          return { Component: Home };
        },
      },
      {
        path: "search",
        lazy: async () => {
          const { PropertySearch } = await import("./pages/PropertySearch");
          return { Component: PropertySearch };
        },
      },
      {
        path: "property/:id",
        lazy: async () => {
          const { PropertyDetail } = await import("./pages/PropertyDetail");
          return { Component: PropertyDetail };
        },
      },
      {
        path: "login",
        lazy: async () => {
          const { Login } = await import("./pages/auth/Login");
          return { Component: Login };
        },
      },
      {
        path: "forgot-password",
        lazy: async () => {
          const { ResetPassword } = await import("./pages/auth/ResetPassword");
          return { Component: ResetPassword };
        },
      },
      {
        path: "signup",
        lazy: async () => {
          const { Signup } = await import("./pages/auth/Signup");
          return { Component: Signup };
        },
      },
      {
        path: "app/*",
        lazy: async () => {
          const { UserDashboard } = await import("./pages/user/Dashboard");

          return {
            Component: function ProtectedUserDashboardRoute() {
              return (
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace",
        lazy: async () => {
          const { WorkspaceEntry } = await import("./pages/workspace/WorkspaceEntry");

          return {
            Component: function ProtectedWorkspaceEntryRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceEntry />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace/accept",
        lazy: async () => {
          const { WorkspaceInviteAccept } = await import(
            "./pages/workspace/WorkspaceInviteAccept"
          );

          return {
            Component: function ProtectedWorkspaceInviteRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceInviteAccept />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace/:organizationSlug",
        lazy: async () => {
          const { WorkspaceLayout } = await import("./pages/workspace/WorkspaceLayout");

          return {
            Component: function ProtectedWorkspaceRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace/:organizationSlug/:page",
        lazy: async () => {
          const { WorkspaceLayout } = await import("./pages/workspace/WorkspaceLayout");

          return {
            Component: function ProtectedWorkspacePageRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "admin/*",
        lazy: async () => {
          const { AdminLayout } = await import("./pages/admin/AdminLayout");

          return {
            Component: function ProtectedAdminRoute() {
              return (
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
