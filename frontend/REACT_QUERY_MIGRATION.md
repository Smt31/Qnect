# React Query Migration Guide for QPoint Application

## Overview
This document outlines the migration from manual state management to React Query for efficient data fetching, caching, and state management in the QPoint application.

## Root Causes Addressed
1. **Unnecessary API calls**: Components were refetching data on every mount/navigation
2. **No caching**: Data was not being cached between component mounts/unmounts
3. **Inefficient state management**: Manual state updates without centralized caching
4. **Poor performance**: Multiple identical API calls due to lack of query deduplication

## Solution Implemented

### 1. React Query Setup
- Installed `@tanstack/react-query` 
- Wrapped application with `QueryClientProvider`
- Configured global cache settings with appropriate staleTime and cacheTime values

### 2. API Layer Enhancement
- Created `queryHooks.js` with custom React Query hooks
- Implemented proper caching strategies per data type:
  - User data: 10-15 minutes stale time
  - Questions/feed: 5-10 minutes stale time
  - Votes: 30 seconds stale time (frequently changing)
  - Notifications: 1 minute stale time with window focus refetch

### 3. Component Refactoring
- Replaced manual `useEffect` data fetching with React Query hooks
- Implemented optimistic updates for mutations
- Maintained existing UI/UX while improving performance

## Caching Strategies

### Cache Time Durations
- **User Profile Data**: 10-15 minutes (changes infrequently)
- **Feed Data**: 5-10 minutes (content changes but not rapidly)
- **Questions**: 10-15 minutes (content is relatively stable)
- **Votes/Counts**: 30 seconds (real-time interactions)
- **Bookmarks**: 30 seconds (user interactions)
- **Notifications**: 1 minute with window focus refetch (real-time updates)

### Refetch Policies
- `refetchOnWindowFocus`: Disabled for most queries to prevent jarring UI updates
- `refetchOnReconnect`: Enabled to refresh data after network issues
- Manual refetch: Available via `refetch()` function when needed

## Key Benefits

### Performance Improvements
- **Reduced API calls**: Query deduplication prevents multiple identical requests
- **Faster navigation**: Cached data is served immediately on navigation
- **Optimistic updates**: UI updates instantly with mutation feedback

### Developer Experience
- **Simplified data fetching**: Single hook replaces complex useEffect logic
- **Built-in caching**: No need to manually manage cache invalidation
- **Error handling**: Centralized error handling with retry mechanisms

### User Experience
- **Faster perceived performance**: Cached data shows immediately
- **Smooth navigation**: No loading states during navigation
- **Reliable interactions**: Optimistic updates provide instant feedback

## Implementation Details

### Query Hook Examples
```javascript
// Fetch user profile with caching
const { data: profile, isLoading, error } = useUserProfile(userId);

// Create question with automatic cache invalidation
const createQuestionMutation = useCreateQuestion();
const handleCreate = () => createQuestionMutation.mutate(questionData);
```

### Cache Invalidation Strategy
- Mutations automatically invalidate relevant queries
- Related data is refreshed (e.g., creating a question refreshes feed)
- Optimistic updates provide immediate UI feedback

## Production Recommendations

### Performance Monitoring
- Monitor query performance with React Query DevTools
- Track cache hit rates and API call reduction
- Measure perceived loading times vs actual loading times

### Error Handling
- Implement global error handling with React Query
- Add user-friendly error messages for common failure scenarios
- Consider offline support with persisted cache

### Cache Size Management
- Monitor cache size in production
- Implement cache size limits if needed
- Consider cache partitioning for very large datasets

### Server-Side Considerations
- Ensure API endpoints support proper caching headers
- Implement proper ETags or cache-busting strategies
- Monitor API response times and optimize as needed

## Migration Impact

### Before Migration
- Page navigation triggered full data refetches
- Multiple identical API calls during concurrent operations
- Manual state management prone to inconsistencies

### After Migration
- Page navigation uses cached data when available
- Single API call per unique query with automatic deduplication
- Centralized state management with consistent caching

## Next Steps

1. **Performance Testing**: Conduct load testing to validate improvements
2. **Monitoring**: Set up monitoring for API call reduction metrics
3. **Advanced Features**: Consider implementing persisted cache for offline support
4. **Code Splitting**: Further optimize by splitting query hooks by feature area

## Files Modified

- `frontend/src/App.jsx` - Added QueryClientProvider
- `frontend/src/api/queryHooks.js` - Created React Query hooks
- `frontend/src/api.js` - Enhanced response handling
- `frontend/src/pages/HomePage.jsx` - Refactored to use React Query
- `frontend/src/pages/QuestionPage.jsx` - Refactored to use React Query
- `frontend/src/pages/ProfilePage.jsx` - Refactored to use React Query