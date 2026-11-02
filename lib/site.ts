export const site = {
  school: "The Ardee School",
  helpEmail: "support@myatlasedu.ai",
  routes: {
    login: "/login",
  },
  /** Where families sign in to Atlas once their accounts exist (step 10) */
  atlasUrl: process.env.NEXT_PUBLIC_ATLAS_URL ?? "https://app.myatlasedu.ai",
} as const;
