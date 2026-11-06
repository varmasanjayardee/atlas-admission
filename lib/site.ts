export const site = {
  school: "The Ardee School",
  helpLine: "18001027333",
  routes: {
    login: "/login",
  },
  /** Where families sign in to Atlas once their accounts exist (step 11) */
  atlasUrl: process.env.NEXT_PUBLIC_ATLAS_URL ?? "https://app.myatlasedu.ai",
} as const;

// .venv/bin/python manage.py shell -c "
// from schools.models import Campus
// for n in ['Ardee Montessori House, Munirka', 'Ardee Montessori House, Noida', 'Ardee Montessori House, Gurugram']:
//     campus, created = Campus.objects.get_or_create(name=n, defaults={'address': '', 'logo': ''})
//     print(campus.id, campus.name, 'created' if created else 'already there')
// "