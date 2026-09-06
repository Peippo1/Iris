import {
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from './firebase';
import { CommuteSummary, ListenLaterItem, NewsArticle, UserPreferences, SharedLibrary, RecentArticleSearch } from '../types';

// ==================== USER PREFERENCES ====================
export async function saveUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>,
  userData?: { email?: string | null; displayName?: string | null; photoURL?: string | null }
) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        ...userData,
        ...prefs,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving user preferences to Firestore:', err);
  }
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserPreferences;
    }
  } catch (err) {
    console.error('Error getting user preferences:', err);
  }
  return null;
}

// ==================== SAVED DIGESTS ====================
export function subscribeToSavedDigests(
  userId: string,
  onUpdate: (digests: CommuteSummary[]) => void
) {
  const digestsRef = collection(db, 'users', userId, 'savedDigests');
  const q = query(digestsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CommuteSummary[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Saved digests snapshot listener error:', err.message);
    }
  );
}

export async function saveDigest(userId: string, digest: CommuteSummary) {
  try {
    const digestRef = doc(db, 'users', userId, 'savedDigests', digest.id);
    await setDoc(digestRef, {
      ...digest,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error saving digest to Firestore:', err);
    throw err;
  }
}

export async function deleteDigest(userId: string, digestId: string) {
  try {
    const digestRef = doc(db, 'users', userId, 'savedDigests', digestId);
    await deleteDoc(digestRef);
  } catch (err) {
    console.error('Error deleting digest from Firestore:', err);
    throw err;
  }
}

// ==================== LISTEN LATER QUEUE ====================
export function subscribeToListenLater(
  userId: string,
  onUpdate: (items: ListenLaterItem[]) => void
) {
  const queueRef = collection(db, 'users', userId, 'listenLaterQueue');
  const q = query(queueRef, orderBy('order', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ListenLaterItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Listen later snapshot error:', err.message);
    }
  );
}

export async function addToListenLater(userId: string, item: ListenLaterItem) {
  try {
    const itemRef = doc(db, 'users', userId, 'listenLaterQueue', item.id);
    await setDoc(itemRef, {
      ...item,
      userId,
      addedAt: item.addedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error adding to listen later in Firestore:', err);
    throw err;
  }
}

export async function removeFromListenLater(userId: string, itemId: string) {
  try {
    const itemRef = doc(db, 'users', userId, 'listenLaterQueue', itemId);
    await deleteDoc(itemRef);
  } catch (err) {
    console.error('Error removing from listen later in Firestore:', err);
    throw err;
  }
}

export async function updateListenLaterItem(
  userId: string,
  itemId: string,
  updates: Partial<ListenLaterItem>
) {
  try {
    const itemRef = doc(db, 'users', userId, 'listenLaterQueue', itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error updating listen later item in Firestore:', err);
    throw err;
  }
}

export async function clearListenLater(userId: string, currentItems?: ListenLaterItem[]) {
  try {
    if (currentItems && currentItems.length > 0) {
      for (const item of currentItems) {
        const itemRef = doc(db, 'users', userId, 'listenLaterQueue', item.id);
        await deleteDoc(itemRef);
      }
    } else {
      const queueRef = collection(db, 'users', userId, 'listenLaterQueue');
      const snap = await getDocs(queueRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (err) {
    console.error('Error clearing listen later in Firestore:', err);
    throw err;
  }
}

export const clearListenLaterQueue = clearListenLater;

// ==================== USER ARTICLES ====================
export function subscribeToUserArticles(
  userId: string,
  onUpdate: (articles: NewsArticle[]) => void
) {
  const articlesRef = collection(db, 'users', userId, 'articles');
  const q = query(articlesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: NewsArticle[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('User articles snapshot error:', err.message);
    }
  );
}

export async function saveUserArticle(userId: string, article: NewsArticle) {
  try {
    const articleRef = doc(db, 'users', userId, 'articles', article.id);
    await setDoc(articleRef, {
      ...article,
      userId,
      createdAt: article.publishedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error saving article to Firestore:', err);
    throw err;
  }
}

export async function deleteUserArticle(userId: string, articleId: string) {
  try {
    const articleRef = doc(db, 'users', userId, 'articles', articleId);
    await deleteDoc(articleRef);
  } catch (err) {
    console.error('Error deleting article from Firestore:', err);
    throw err;
  }
}

// ==================== SHARED LIBRARIES & CURATIONS ====================
export async function createSharedLibrary(
  payload: Omit<SharedLibrary, 'shareId' | 'createdAt'>
): Promise<string> {
  try {
    const shareId = `share-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const shareRef = doc(db, 'sharedLibraries', shareId);
    const sharedData: SharedLibrary = {
      ...payload,
      shareId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(shareRef, sharedData);
    return shareId;
  } catch (err) {
    console.error('Error creating shared library in Firestore:', err);
    throw err;
  }
}

export async function getSharedLibrary(shareId: string): Promise<SharedLibrary | null> {
  try {
    const shareRef = doc(db, 'sharedLibraries', shareId);
    const snap = await getDoc(shareRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as SharedLibrary;
  } catch (err) {
    console.error('Error fetching shared library from Firestore:', err);
    throw err;
  }
}

// ==================== RECENT ARTICLE SEARCHES ====================
export function subscribeToRecentSearches(
  userId: string,
  onUpdate: (searches: RecentArticleSearch[]) => void
) {
  const searchesRef = collection(db, 'users', userId, 'recentSearches');
  const q = query(searchesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: RecentArticleSearch[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Recent searches snapshot error:', err.message);
    }
  );
}

export async function saveRecentSearch(userId: string, search: RecentArticleSearch) {
  try {
    const searchRef = doc(db, 'users', userId, 'recentSearches', search.id);
    await setDoc(searchRef, {
      ...search,
      userId,
      createdAt: search.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error saving recent search in Firestore:', err);
    throw err;
  }
}

export async function deleteRecentSearch(userId: string, searchId: string) {
  try {
    const searchRef = doc(db, 'users', userId, 'recentSearches', searchId);
    await deleteDoc(searchRef);
  } catch (err) {
    console.error('Error deleting recent search in Firestore:', err);
    throw err;
  }
}

export async function clearRecentSearches(userId: string, searches?: RecentArticleSearch[]) {
  try {
    if (searches && searches.length > 0) {
      for (const item of searches) {
        const itemRef = doc(db, 'users', userId, 'recentSearches', item.id);
        await deleteDoc(itemRef);
      }
    } else {
      const searchesRef = collection(db, 'users', userId, 'recentSearches');
      const snap = await getDocs(searchesRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (err) {
    console.error('Error clearing recent searches in Firestore:', err);
    throw err;
  }
}

