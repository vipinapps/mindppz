/**
 * Survey definition, transcribed from "PhD_Research_Support_Survey.pdf".
 * Used by the browser (rendering, validation, admin summaries, CSV export)
 * and by scripts/build.js, which generates the matching Firestore security
 * rules (firestore.rules) so the database enforces the same answer format.
 *
 * type: "multi"  -> checkboxes, optional `max` selections
 *       "single" -> radio buttons
 *       "text"   -> open-ended answer
 * An option with `other: true` asks the respondent to specify a value.
 */
export const survey = {
  title: 'Shaping the Next-Generation PhD & Research Support Platform',
  kicker: 'User Experience & Needs Survey',
  brand: 'Research Voices',
  tagline: 'Connect. Collaborate. Discover',
  intro:
    'We are exploring the development of a new online platform to support PhD aspirants, ' +
    'students and researchers. This survey aims to understand your experiences with existing ' +
    'websites, the difficulties you face and the features you feel are currently missing.',
  audiences: ['PhD Aspirants', 'Doctoral Students', 'Academic Researchers', '10 Key Questions • ~3 Mins'],
  questions: [
    {
      id: 'q1',
      short: 'Current Websites & Platforms',
      title: 'Current Discovery Channels',
      question: 'Which websites or platforms do you currently use to find PhD opportunities and research support?',
      type: 'multi',
      hint: 'Select all that apply.',
      options: [
        { id: 'findaphd', label: 'FindAPhD' },
        { id: 'university', label: 'University websites' },
        { id: 'linkedin', label: 'LinkedIn' },
        { id: 'researchgate', label: 'ResearchGate' },
        { id: 'scholar', label: 'Google Scholar' },
        { id: 'other', label: 'Other', other: true },
      ],
    },
    {
      id: 'q2',
      short: 'Existing Website Frustrations',
      title: 'Platform Frustrations & Friction',
      question: 'What is your biggest frustration when using existing PhD or research websites?',
      type: 'multi',
      max: 3,
      hint: 'Select up to 3 options.',
      options: [
        { id: 'scattered', label: 'Information is scattered across multiple websites.' },
        { id: 'outdated', label: 'Opportunities are outdated or difficult to find.' },
        { id: 'funding', label: 'Funding information is unclear.' },
        { id: 'supervisors', label: 'Difficult to identify suitable supervisors.' },
        { id: 'personalised', label: 'Lack of personalised recommendations.' },
        { id: 'navigation', label: 'Websites are complicated to navigate.' },
        { id: 'other', label: 'Other.', other: true, wide: true },
      ],
    },
    {
      id: 'q3',
      short: 'Biggest PhD Search Challenges',
      title: 'Core PhD Search Obstacles',
      question: 'What is the biggest challenge you face when searching for a suitable PhD opportunity?',
      type: 'multi',
      max: 3,
      hint: 'Select up to 3 options.',
      options: [
        { id: 'funded', label: 'Finding fully funded positions.' },
        { id: 'supervisor', label: 'Finding a supervisor in my research area.' },
        { id: 'requirements', label: 'Matching my academic background with entry requirements.' },
        { id: 'topics', label: 'Identifying suitable research topics.' },
        { id: 'international', label: 'Finding opportunities for international applicants.' },
        { id: 'procedures', label: 'Understanding application procedures.' },
      ],
    },
    {
      id: 'q4',
      short: 'Application Journey Guidance',
      title: 'Application Journey Guidance',
      question: 'Do you feel existing platforms provide enough guidance throughout the PhD application journey?',
      type: 'single',
      hint: 'Select one option.',
      options: [
        { id: 'yes', label: 'Yes, completely.' },
        { id: 'some', label: 'To some extent.' },
        { id: 'gaps', label: 'No, there are significant gaps.' },
        { id: 'unsure', label: 'I am not sure.' },
      ],
    },
    {
      id: 'q5',
      short: 'Hard-to-Access Information',
      title: 'Information Centralisation & Access',
      question: 'What information do you find most difficult to access in one place?',
      type: 'multi',
      max: 3,
      hint: 'Select up to 3 options.',
      options: [
        { id: 'deadlines', label: 'PhD opportunities and deadlines.' },
        { id: 'scholarships', label: 'Scholarships and funding.' },
        { id: 'profiles', label: 'Supervisor profiles and research interests.' },
        { id: 'proposal', label: 'Research proposal guidance.' },
        { id: 'admission', label: 'University admission requirements.' },
        { id: 'visa', label: 'Visa and international student information.' },
      ],
    },
    {
      id: 'q6',
      short: 'Missing Platform Support',
      title: 'Unmet Support & Mentorship Needs',
      question: 'What support do you wish existing research platforms offered but currently don’t provide adequately?',
      type: 'multi',
      hint: 'Select all that apply.',
      options: [
        { id: 'mentors', label: 'Direct access to experienced researcher mentors.' },
        { id: 'matching', label: 'Personalised PhD opportunity matching.' },
        { id: 'ai_gap', label: 'AI-powered research gap identification.' },
        { id: 'connect', label: 'Help connecting with potential supervisors.' },
        { id: 'network', label: 'Research collaboration and networking.' },
        { id: 'writing', label: 'Academic writing and publication guidance.' },
      ],
    },
    {
      id: 'q7',
      short: 'Missed Deadlines & Impact',
      title: 'Missed Deadlines & Opportunities',
      question:
        'Have you ever missed a PhD opportunity, scholarship or research deadline because you couldn’t find the information at the right time?',
      type: 'single',
      hint: 'Select one option.',
      options: [
        { id: 'several', label: 'Yes, several times.' },
        { id: 'once', label: 'Yes, once or twice.' },
        { id: 'no', label: 'No.' },
        { id: 'na', label: 'Not applicable.' },
      ],
    },
    {
      id: 'q8',
      short: 'All-in-One Platform Value',
      title: 'Value of an All-in-One Ecosystem',
      question:
        'How important would it be to have PhD opportunities, funding, supervisor connections, mentorship and research resources available on one platform?',
      type: 'single',
      hint: 'Select one option.',
      options: [
        { id: 'extremely', label: 'Extremely important.' },
        { id: 'very', label: 'Very important.' },
        { id: 'moderately', label: 'Moderately important.' },
        { id: 'not_very', label: 'Not very important.' },
        { id: 'not', label: 'Not important.' },
      ],
    },
    {
      id: 'q9',
      short: 'Readiness to Switch Platforms',
      title: 'Platform Adoption Readiness',
      question: 'If a new platform addressed the problems you experience with existing websites, would you consider switching to it?',
      type: 'single',
      hint: 'Select one option.',
      options: [
        { id: 'definitely', label: 'Definitely.' },
        { id: 'probably', label: 'Probably.' },
        { id: 'maybe', label: 'Maybe, depending on its features.' },
        { id: 'no', label: 'No, I am happy with existing platforms.' },
      ],
    },
    {
      id: 'q10',
      short: 'Top Priority Feature (Open-Ended)',
      title: 'Unmet Needs & Priority Feature',
      question: 'What is the ONE feature or improvement you would most like to see in a new PhD and research-support website?',
      type: 'text',
      hint: 'Open-ended response: Tell us what existing platforms are missing and what would make your research journey easier.',
      placeholder: 'Write freely about features, tools, funding filters, or mentorship support…',
      maxLength: 2000,
      suggestions: [
        'Centralised Funding & Deadlines',
        'Direct Supervisor Matching',
        'AI Research Gap Finder',
        '1-on-1 Mentor Network',
        'Visa & Admissions Guide',
      ],
    },
  ],
};

// Attach illustration paths (cropped from the PDF into public/img).
for (const q of survey.questions) {
  (q.options || []).forEach((o, i) => {
    o.img = `/img/${q.id}-${i + 1}.webp`;
  });
}

export const OTHER_MAX = 200;

/**
 * Validate and normalise a submitted answers object.
 * Returns { ok: true, answers } or { ok: false, errors: { qid: message } }.
 */
export function validateAnswers(input) {
  const errors = {};
  const answers = {};
  const src = input && typeof input === 'object' ? input : {};

  for (const q of survey.questions) {
    const a = src[q.id] && typeof src[q.id] === 'object' ? src[q.id] : {};

    if (q.type === 'text') {
      const text = typeof a.text === 'string' ? a.text.trim() : '';
      if (!text) errors[q.id] = 'Please write a short answer.';
      else if (text.length > q.maxLength) errors[q.id] = `Please keep it under ${q.maxLength} characters.`;
      else answers[q.id] = { text };
      continue;
    }

    const valid = new Set(q.options.map((o) => o.id));
    let selected = Array.isArray(a.selected) ? a.selected.filter((s) => typeof s === 'string' && valid.has(s)) : [];
    selected = [...new Set(selected)];

    if (selected.length === 0) {
      errors[q.id] = 'Please choose an option.';
      continue;
    }
    if (q.type === 'single' && selected.length > 1) {
      errors[q.id] = 'Please choose only one option.';
      continue;
    }
    if (q.max && selected.length > q.max) {
      errors[q.id] = `Please choose at most ${q.max} options.`;
      continue;
    }

    const out = { selected };
    const otherOpt = q.options.find((o) => o.other);
    if (otherOpt && selected.includes(otherOpt.id)) {
      const other = typeof a.other === 'string' ? a.other.trim() : '';
      if (!other) {
        errors[q.id] = 'Please specify your “Other” answer.';
        continue;
      }
      out.other = other.slice(0, OTHER_MAX);
    }
    answers[q.id] = out;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

/** Human-readable answer text for one question (used by CSV export). */
export function describeAnswer(q, a) {
  if (!a) return '';
  if (q.type === 'text') return a.text || '';
  return (a.selected || [])
    .map((id) => {
      const o = q.options.find((x) => x.id === id);
      if (!o) return id;
      return o.other && a.other ? `${o.label.replace(/\.$/, '')}: ${a.other}` : o.label;
    })
    .join(' | ');
}
