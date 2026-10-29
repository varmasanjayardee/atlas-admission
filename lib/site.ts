export const site = {
  school: "The Ardee School",
  helpEmail: "admissions@theardeeschool.com",
  routes: {
    login: "/login",
  },
  /** Where families sign in to Atlas once their accounts exist (step 10) */
  atlasUrl: process.env.NEXT_PUBLIC_ATLAS_URL ?? "https://app.ardeeatlas.ai",
} as const;
