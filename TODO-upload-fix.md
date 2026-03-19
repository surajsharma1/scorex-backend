# Club Logo Upload ENOENT Fix

**Status:** Core fix complete.

**Steps:**
1. [x] Plan approval ✅
2. [x] Update middleware/upload.ts (absolute path + mkdir) ✅
3. [x] Add static /uploads in server.ts ✅
4. [ ] Test local dev server: cd scorex-backend/scorex-backend && npm run dev, then upload via frontend/Postman
5. [ ] Deploy to Render: git push, test https://scorex-backend.onrender.com/api/v1/clubs/.../upload-logo
6. [x] Complete ✅

**Next:** Test upload. Files now save to public/uploads/, served at /uploads/.
