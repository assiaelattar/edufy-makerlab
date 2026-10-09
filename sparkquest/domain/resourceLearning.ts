import type { Resource, ResourceLibraryItem, ResourceProgress, StudentProject } from '../types.ts';

const clean = (value: unknown) => String(value || '').trim();

export const resourceIdentity = (resource: Resource) => clean(resource.libraryId || resource.id || resource.url);

export const resourceRequiresMastery = (resource: Resource) => resource.requiredForProgress === true;

export const resourceHasValidQuiz = (resource: Resource) => Boolean(
  resource.quiz
  && resource.quiz.version > 0
  && resource.quiz.passingScore > 0
  && resource.quiz.passingScore <= 100
  && resource.quiz.questions.length
  && resource.quiz.questions.every(question => (
    clean(question.prompt)
    && question.options.length >= 2
    && question.options.every(option => clean(option))
    && Number.isInteger(question.correctOptionIndex)
    && question.correctOptionIndex >= 0
    && question.correctOptionIndex < question.options.length
  )),
);

export const resourceMastered = (project: Pick<StudentProject, 'resourceProgress'>, resource: Resource) => {
  if (!resourceRequiresMastery(resource)) return true;
  if (!resourceHasValidQuiz(resource)) return false;
  const progress = project.resourceProgress?.[resourceIdentity(resource)];
  return Boolean(progress?.passedAt && progress.quizVersion === resource.quiz?.version && progress.score >= (resource.quiz?.passingScore || 100));
};

export const pendingRequiredResources = (project: Pick<StudentProject, 'resourceProgress'>, resources: Resource[] = []) => resources.filter(resource => resourceRequiresMastery(resource) && !resourceMastered(project, resource));

export function scoreResourceQuiz(resource: Resource, answers: Record<string, number>) {
  if (!resourceHasValidQuiz(resource) || !resource.quiz) throw new Error('This resource does not have a valid knowledge check.');
  const correct = resource.quiz.questions.filter(question => answers[question.id] === question.correctOptionIndex).length;
  const score = Math.round((correct / resource.quiz.questions.length) * 100);
  return { correct, total: resource.quiz.questions.length, score, passed: score >= resource.quiz.passingScore };
}

export function nextResourceProgress(resource: Resource, current: ResourceProgress | undefined, score: number, passedAt: string): ResourceProgress {
  if (!resource.quiz) throw new Error('This resource does not have a knowledge check.');
  return {
    resourceId: resourceIdentity(resource),
    quizVersion: resource.quiz.version,
    attempts: (current?.attempts || 0) + 1,
    score,
    passedAt,
  };
}

export const resourceTypeLabel = (resource: Resource) => {
  if (resource.type === 'tool') {
    if (resource.toolAccess === 'download') return 'Installable tool';
    if (resource.toolAccess === 'plugin') return 'Plugin or extension';
    return 'Web tool';
  }
  if (resource.type === 'video') return 'Video';
  if (resource.type === 'image') return 'Image';
  if (resource.type === 'file' && /pdf/i.test(`${resource.mimeType || ''} ${resource.url}`)) return 'PDF';
  if (resource.type === 'file') return 'File';
  return 'Link';
};

export function filterResourceLibrary(items: ResourceLibraryItem[], search: string, type: 'all' | Resource['type']) {
  const needle = clean(search).toLocaleLowerCase();
  return items.filter(item => item.status !== 'archived'
    && (type === 'all' || item.type === type)
    && (!needle || [item.title, item.description, ...(item.tags || [])].some(value => clean(value).toLocaleLowerCase().includes(needle))));
}

export function validateLibraryResource(resource: Resource) {
  if (!clean(resource.title)) throw new Error('Add a resource title.');
  try {
    const url = new URL(resource.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch { throw new Error('Add a valid https:// resource URL or upload a file.'); }
  if (resource.quiz && !resourceHasValidQuiz(resource)) throw new Error('Complete every knowledge-check question and mark one valid answer.');
  if (resource.requiredForProgress && !resourceHasValidQuiz(resource)) throw new Error('Add a valid knowledge check before making this resource required for progress.');
}
