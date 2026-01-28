# Testing Chat Message Deletion - Step by Step Guide

## ✅ Prerequisites Check

Before testing, verify:

### 1. Backend is Running
Check terminal for:
```
Started QpointApplication in X.XXX seconds
Tomcat started on port(s): 8080 (http)
```

### 2. Database Table Created
Run in Neon SQL Editor:
```sql
SELECT * FROM message_deletions LIMIT 5;
```
Should return empty table (not error).

---

## 🧪 Testing Strategy

### Test 1: Delete for Me (Basic)

**Steps:**
1. Open chat with SMTandel (as shown in your screenshot)
2. Send a test message: "This is a test message"
3. **Right-click** on the message you just sent
4. Select "Delete for Me"
5. Confirm deletion

**Expected Result:**
- ✅ Message disappears from YOUR chat window
- ✅ Message still visible in SMTandel's chat
- ✅ Database has 1 record: `SELECT * FROM message_deletions;`

**If it doesn't work:**
- Check browser console (F12) for errors
- Check if context menu appears on right-click
- Verify ChatWindow integration is complete

---

### Test 2: Delete for Everyone (15-min window)

**Steps:**
1. Send a NEW message: "Delete this for everyone"
2. **Right-click** within 15 minutes
3. You should see TWO options:
   - "Delete for Me"
   - "Delete for Everyone" (with countdown timer)
4. Click "Delete for Everyone"
5. Confirm deletion

**Expected Result:**
- ✅ Message disappears from YOUR chat
- ✅ Message disappears from SMTandel's chat (if they refresh)
- ✅ WebSocket sends delete event to both users
- ✅ Database shows deletion_type = 'FOR_EVERYONE'

**To verify WebSocket worked:**
- Open chat as SMTandel in another browser/incognito
- Message should disappear in real-time

---

### Test 3: Time Limit (15 minutes expired)

**Steps:**
1. Find an OLD message (sent more than 15 min ago)
2. Right-click on it
3. Check context menu options

**Expected Result:**
- ✅ ONLY shows "Delete for Me"
- ❌ "Delete for Everyone" is hidden
- Timer shows: "0 min left" or option not shown

---

### Test 4: Clear Conversation

**Backend API Test** (use Postman/Thunder Client):

```http
DELETE http://localhost:8080/api/chat/conversations/2/clear
Authorization: Bearer YOUR_JWT_TOKEN
```

Replace `2` with SMTandel's userId.

**Expected Result:**
- ✅ ALL messages in conversation disappear for you
- ✅ Batch deletion records created in database
- ✅ SMTandel still sees all messages

**Query to verify:**
```sql
SELECT COUNT(*) 
FROM message_deletions 
WHERE user_id = YOUR_USER_ID;
```

---

## 🔍 Debugging Guide

### If Context Menu Doesn't Appear

**Check 1: ChatWindow Integration**
```javascript
// In ChatWindow.jsx, verify this exists:
onContextMenu={(e) => handleContextMenu(e, msg)}
```

**Check 2: Console Errors**
Press F12 → Console tab → Look for:
- `Cannot find module 'MessageContextMenu'`
- `handleContextMenu is not defined`

---

### If Delete API Fails

**Check 1: Network Tab**
1. F12 → Network tab
2. Try deleting a message
3. Look for failed request:
   - `DELETE /api/chat/messages/{id}/delete-for-me` → Should return 200
   - If 401: Authentication issue
   - If 404: Endpoint not registered
   - If 500: Backend error (check logs)

**Check 2: Backend Logs**
Look for:
```
ERROR: Failed to create query for MessageDeletionRepository
```

If you see this, repository methods need fixing.

---

### If Deleted Messages Still Show

**Check 1: Cache Invalidation**
```javascript
// After delete, should see:
queryClient.invalidateQueries({ queryKey: ['messages', ...] })
```

**Check 2: Backend Query**
Run in **Neon**:
```sql
-- Check if deletion was recorded
SELECT * FROM message_deletions WHERE message_id = 123;

-- Check if query-level filtering works
SELECT m.* 
FROM messages m
WHERE NOT EXISTS (
    SELECT 1 FROM message_deletions md 
    WHERE md.message_id = m.id 
    AND md.user_id = YOUR_USER_ID
);
```

---

## 📊 Success Indicators

### ✅ Everything Working Correctly

1. **Right-click shows context menu** ✓
2. **Delete for me removes message locally** ✓
3. **Delete for everyone shows timer** ✓
4. **WebSocket syncs across devices** ✓
5. **Database records created** ✓
6. **No console errors** ✓

### Database Verification

```sql
-- After all tests, check data:
SELECT 
    md.id,
    m.content,
    u.username,
    md.deletion_type,
    md.deleted_at
FROM message_deletions md
JOIN messages m ON md.message_id = m.id
JOIN users u ON md.user_id = u.id
ORDER BY md.deleted_at DESC;
```

---

## 🚨 Known Issues & Fixes

### Issue 1: "Cannot find symbol: MessageDeletion"
**Fix:** Backend compilation failed. Run:
```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
```

### Issue 2: Context menu appears outside viewport
**Fix:** Update MessageContextMenu position calculation:
```javascript
const adjustedX = Math.min(position.x, window.innerWidth - 200);
const adjustedY = Math.min(position.y, window.innerHeight - 150);
```

### Issue 3: WebSocket not syncing
**Check:** WebSocketService subscription in ChatWindow:
```javascript
const subscription = webSocketService.subscribeToMessageDeleted(...)
```

---

## 🎯 Quick Test Checklist

Run through this in 2 minutes:

- [ ] Send message to SMTandel
- [ ] Right-click message
- [ ] See context menu with "Delete for Me"
- [ ] Click delete
- [ ] Message disappears
- [ ] Check database: `SELECT COUNT(*) FROM message_deletions;` → Returns 1
- [ ] Backend logs show no errors
- [ ] Frontend console shows no errors

---

## 📹 Visual Testing

**Before Delete:**
```
[You]: This is a test message   ← Message visible
```

**After "Delete for Me":**
```
[Empty or next message]         ← Message gone for you
```

**SMTandel's View (still sees it):**
```
[You]: This is a test message   ← Still visible to them
```

---

## Need Help?

If any test fails, share:
1. Screenshot of error
2. Browser console output (F12)
3. Backend logs
4. Database query results

I'll help debug! 🚀
