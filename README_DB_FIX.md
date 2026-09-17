Fixes Applied:
- Reverted the data persistence logic in `SummonContext` and `AuthContext` to use the `/api` endpoints (MongoDB), retaining the original database structure and logic.
- Removed the `firebase/firestore` initialization from `firebase.ts` to stop the missing database warning.
- Preserved the new responsive autosave UI and Welcome Screen logic.
