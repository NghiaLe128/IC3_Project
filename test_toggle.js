async function toggleTabLockState(tabId, isLocked) {
  if (!activeClassId) return;
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const classIndex = classes.findIndex(c => c.id === activeClassId);
  if (classIndex === -1) return;
  const currentClass = classes[classIndex];
  // ...
}
