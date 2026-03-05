export function groupTasksByDate(tasks) {
  return tasks.reduce((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    return acc;
  }, {});
}

export function parseTags(input) {
  if (!input) {
    return [];
  }
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tags));
}
