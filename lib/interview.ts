import type { CandidateStatus, InterviewRecommendation } from './types';

export const CANDIDATE_STATUS_OPTIONS: Array<{
  value: CandidateStatus;
  label: string;
  tone: string;
}> = [
  { value: 'new', label: '新候选人', tone: 'bg-slate-100 text-slate-700' },
  { value: 'screening', label: '筛选中', tone: 'bg-amber-100 text-amber-700' },
  { value: 'interviewing', label: '面试中', tone: 'bg-sky-100 text-sky-700' },
  { value: 'offer', label: 'Offer', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'hold', label: '暂缓', tone: 'bg-stone-200 text-stone-700' },
  { value: 'rejected', label: '未通过', tone: 'bg-rose-100 text-rose-700' },
];

export const INTERVIEW_RECOMMENDATION_OPTIONS: Array<{
  value: InterviewRecommendation;
  label: string;
  tone: string;
}> = [
  { value: 'strong_yes', label: '强烈推荐', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'yes', label: '推荐', tone: 'bg-lime-100 text-lime-700' },
  { value: 'mixed', label: '保留意见', tone: 'bg-amber-100 text-amber-700' },
  { value: 'no', label: '不推荐', tone: 'bg-rose-100 text-rose-700' },
  { value: 'pending', label: '待判断', tone: 'bg-slate-100 text-slate-700' },
];

export function getCandidateStatusMeta(status: CandidateStatus) {
  return (
    CANDIDATE_STATUS_OPTIONS.find((item) => item.value === status) ||
    CANDIDATE_STATUS_OPTIONS[0]
  );
}

export function getRecommendationMeta(value: InterviewRecommendation) {
  return (
    INTERVIEW_RECOMMENDATION_OPTIONS.find((item) => item.value === value) ||
    INTERVIEW_RECOMMENDATION_OPTIONS[INTERVIEW_RECOMMENDATION_OPTIONS.length - 1]
  );
}
