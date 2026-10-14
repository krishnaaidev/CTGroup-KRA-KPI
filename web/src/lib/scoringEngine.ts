/**
 * CT Group of Institutions - KRA & KPI Strict Calculation Engine
 * Implements Section 3 of PRD (1,000 Marks Faculty Evaluation Framework)
 */

export interface ScoringInput {
  categoryCode: string;
  target?: string | number;
  achievement: string | number;
  details?: Record<string, any>;
}

export interface ScoreResult {
  categoryCode: string;
  calculatedScore: number;
  maxMarks: number;
  explanation: string;
  isEligible: boolean;
}

/**
 * Helper to calculate Result Performance and Student Attendance slabs:
 * <50%: 0 marks | 50%-60%: 40 | 60%-70%: 80 | 70%-80%: 100 | 80%-90%: 110 | 90%-95%: 120 | >95%: 150
 */
export function calculateResultOrAttendanceScore(percentage: number): { score: number; explanation: string } {
  if (isNaN(percentage) || percentage < 50) {
    return { score: 0, explanation: 'Below 50% threshold: 0 marks awarded' };
  } else if (percentage >= 50 && percentage <= 60) {
    return { score: 40, explanation: '50% to 60% slab: 40 marks awarded' };
  } else if (percentage > 60 && percentage <= 70) {
    return { score: 80, explanation: '60% to 70% slab: 80 marks awarded' };
  } else if (percentage > 70 && percentage <= 80) {
    return { score: 100, explanation: '70% to 80% slab: 100 marks awarded' };
  } else if (percentage > 80 && percentage <= 90) {
    return { score: 110, explanation: '80% to 90% slab: 110 marks awarded' };
  } else if (percentage > 90 && percentage <= 95) {
    return { score: 120, explanation: '90% to 95% slab: 120 marks awarded' };
  } else {
    return { score: 150, explanation: 'Greater than 95% slab: Full 150 marks awarded' };
  }
}

/**
 * Helper to calculate Mentorship and Alumni Engagement slabs:
 * <70%: 0 marks | 70%-80%: 20 | 80%-90%: 60 | 90%-95%: 80 | >95%: 100
 */
export function calculateMentorshipOrAlumniScore(percentage: number): { score: number; explanation: string } {
  if (isNaN(percentage) || percentage < 70) {
    return { score: 0, explanation: 'Below 70% threshold: 0 marks awarded' };
  } else if (percentage >= 70 && percentage <= 80) {
    return { score: 20, explanation: '70% to 80% slab: 20 marks awarded' };
  } else if (percentage > 80 && percentage <= 90) {
    return { score: 60, explanation: '80% to 90% slab: 60 marks awarded' };
  } else if (percentage > 90 && percentage <= 95) {
    return { score: 80, explanation: '90% to 95% slab: 80 marks awarded' };
  } else {
    return { score: 100, explanation: 'Greater than 95% slab: Full 100 marks awarded' };
  }
}

/**
 * Computes the official score for any category based on PRD institutional rules.
 */
export function computeFacultyScore(input: ScoringInput): ScoreResult {
  const { categoryCode, achievement, details = {} } = input;
  const numAchievement = typeof achievement === 'number' ? achievement : parseFloat(achievement as string) || 0;

  switch (categoryCode) {
    // 1. Lesson Plan & Academic Delivery (Max 50) - Binary (100% = 50, else 0)
    case 'CAT_LESSON_PLAN': {
      const isHundred = numAchievement >= 100;
      return {
        categoryCode,
        maxMarks: 50,
        calculatedScore: isHundred ? 50 : 0,
        explanation: isHundred
          ? '100% semester topics covered: Full 50 marks awarded'
          : `Coverage is ${numAchievement}%. 100% required for binary 50 marks.`,
        isEligible: isHundred,
      };
    }

    // 2. Result Performance (Max 150)
    case 'CAT_RESULT': {
      const { score, explanation } = calculateResultOrAttendanceScore(numAchievement);
      return {
        categoryCode,
        maxMarks: 150,
        calculatedScore: score,
        explanation: `Result performance: ${numAchievement}% -> ${explanation}`,
        isEligible: score > 0,
      };
    }

    // 3. Student Attendance (Max 150)
    case 'CAT_ATTENDANCE': {
      const { score, explanation } = calculateResultOrAttendanceScore(numAchievement);
      return {
        categoryCode,
        maxMarks: 150,
        calculatedScore: score,
        explanation: `Average attendance: ${numAchievement}% -> ${explanation}`,
        isEligible: score > 0,
      };
    }

    // 4. Student Feedback (Max 50)
    // Min. average 4/5, with at least 5 responses per semester
    // <4.0: 0 | 4.0-4.5: 25 | >4.5: 50
    case 'CAT_FEEDBACK': {
      const responsesCount = parseInt(details.responsesCount || '5', 10);
      if (responsesCount < 5) {
        return {
          categoryCode,
          maxMarks: 50,
          calculatedScore: 0,
          explanation: `Only ${responsesCount} feedback responses provided (minimum 5 required for eligibility).`,
          isEligible: false,
        };
      }
      let score = 0;
      let exp = '';
      if (numAchievement < 4.0) {
        score = 0;
        exp = 'Feedback score is below 4.0: 0 marks awarded';
      } else if (numAchievement >= 4.0 && numAchievement <= 4.5) {
        score = 25;
        exp = 'Feedback average between 4.0 and 4.5: 25 marks awarded';
      } else {
        score = 50;
        exp = 'Feedback average above 4.5: Full 50 marks awarded';
      }
      return {
        categoryCode,
        maxMarks: 50,
        calculatedScore: score,
        explanation: `${exp} (${responsesCount} responses verified)`,
        isEligible: score > 0,
      };
    }

    // 5. Admissions Contribution (Max 50)
    // 2 marks per admission, max 50 marks
    case 'CAT_ADMISSION': {
      const admissions = Math.max(0, Math.floor(numAchievement));
      const score = Math.min(admissions * 2, 50);
      return {
        categoryCode,
        maxMarks: 50,
        calculatedScore: score,
        explanation: `${admissions} student admission(s) verified at 2 marks each: ${score} marks awarded (Max 50).`,
        isEligible: score > 0,
      };
    }

    // 6. Teaching Load (Max 30) - Binary (100% = 30, else 0)
    case 'CAT_TEACHING_LOAD': {
      const isHundred = numAchievement >= 100;
      return {
        categoryCode,
        maxMarks: 30,
        calculatedScore: isHundred ? 30 : 0,
        explanation: isHundred
          ? '100% classes conducted according to timetable: Full 30 marks awarded'
          : `${numAchievement}% classes conducted. 100% required for binary 30 marks.`,
        isEligible: isHundred,
      };
    }

    // 7. Course File Maintenance (Max 20) - Binary (100% = 20, else 0)
    case 'CAT_COURSE_FILE': {
      const isComplete = numAchievement >= 100 || details.isComplete === true;
      return {
        categoryCode,
        maxMarks: 20,
        calculatedScore: isComplete ? 20 : 0,
        explanation: isComplete
          ? 'Course file 100% complete and updated during inspection: Full 20 marks awarded'
          : 'Course file incomplete: 0 marks awarded (100% completion required).',
        isEligible: isComplete,
      };
    }

    // 8. Research Publications (Max 50)
    // 1 Scopus/WoS pub/year; first-author only.
    // 1st: 15 | 2nd: 15 | 3rd: 10 | 4th: 10
    case 'CAT_PUBLICATIONS': {
      const pubs = Math.max(0, Math.floor(numAchievement));
      let score = 0;
      if (pubs === 1) score = 15;
      else if (pubs === 2) score = 30; // 15 + 15
      else if (pubs === 3) score = 40; // 15 + 15 + 10
      else if (pubs >= 4) score = 50; // 15 + 15 + 10 + 10 (capped at 50)

      return {
        categoryCode,
        maxMarks: 50,
        calculatedScore: score,
        explanation: `${pubs} Scopus/WoS first-author publication(s): ${score} marks awarded (1st: 15, 2nd: 15, 3rd: 10, 4th: 10, Max: 50).`,
        isEligible: pubs >= 1,
      };
    }

    // 9. Books / Book Chapters (Max 50)
    // 2 eligible pubs/year; first-author only.
    // 1st: 15 | 2nd: 15 | 3rd: 10 | 4th: 10
    case 'CAT_BOOKS': {
      const count = Math.max(0, Math.floor(numAchievement));
      let score = 0;
      if (count === 1) score = 15;
      else if (count === 2) score = 30;
      else if (count === 3) score = 40;
      else if (count >= 4) score = 50;

      return {
        categoryCode,
        maxMarks: 50,
        calculatedScore: score,
        explanation: `${count} Book(s) / Book Chapter(s) (first author): ${score} marks awarded (1st: 15, 2nd: 15, 3rd: 10, 4th: 10, Max: 50).`,
        isEligible: count >= 1,
      };
    }

    // 10. Research Project (Max 40)
    // Submitted = 10 each, Sanctioned = 20 each. Max 40.
    case 'CAT_RESEARCH_PROJECTS': {
      const submitted = parseInt(details.submittedProjects || '0', 10);
      const sanctioned = parseInt(details.sanctionedProjects || '0', 10);
      const total = (submitted * 10) + (sanctioned * 20);
      const score = Math.min(total, 40);

      return {
        categoryCode,
        maxMarks: 40,
        calculatedScore: score,
        explanation: `${submitted} submitted project(s) (10m) + ${sanctioned} sanctioned project(s) (20m) = ${score} marks (Max 40).`,
        isEligible: score > 0,
      };
    }

    // 11. Conference Participation (Max 30)
    // Min. 2 national/international per year. 5 marks per eligible item.
    case 'CAT_CONFERENCES': {
      const count = Math.max(0, Math.floor(numAchievement));
      const score = Math.min(count * 5, 30);
      return {
        categoryCode,
        maxMarks: 30,
        calculatedScore: score,
        explanation: `${count} Conference(s) attended at 5 marks each: ${score} marks awarded (Max 30).`,
        isEligible: count >= 2,
      };
    }

    // 12. FDP / Workshop Participation (Max 30)
    // Min. 2 per year (5 days duration). 5 marks per eligible item.
    case 'CAT_FDP': {
      const count = Math.max(0, Math.floor(numAchievement));
      const score = Math.min(count * 5, 30);
      return {
        categoryCode,
        maxMarks: 30,
        calculatedScore: score,
        explanation: `${count} FDP(s)/Workshop(s) completed (5-day min) at 5 marks each: ${score} marks awarded (Max 30).`,
        isEligible: count >= 2,
      };
    }

    // 13. Additional Certification (Max 20)
    // 1 NASSCOM cert/semester (min 30 hrs with assessment). 5 marks per item. Max 20.
    case 'CAT_CERTIFICATIONS': {
      const count = Math.max(0, Math.floor(numAchievement));
      const score = Math.min(count * 5, 20);
      return {
        categoryCode,
        maxMarks: 20,
        calculatedScore: score,
        explanation: `${count} NASSCOM certification(s) verified at 5 marks each: ${score} marks awarded (Max 20).`,
        isEligible: count >= 1,
      };
    }

    // 14. Mentorship (Max 100)
    // % of mentees completing >=1 NASSCOM cert/semester
    // <70%: 0 | 70%-80%: 20 | 80%-90%: 60 | 90%-95%: 80 | >95%: 100
    case 'CAT_MENTORSHIP': {
      const { score, explanation } = calculateMentorshipOrAlumniScore(numAchievement);
      return {
        categoryCode,
        maxMarks: 100,
        calculatedScore: score,
        explanation: `Mentorship: ${numAchievement}% mentees certified -> ${explanation}`,
        isEligible: score > 0,
      };
    }

    // 15. Alumni Engagement (Max 100)
    // % of assigned alumni updated/engaged through Vaave
    // <70%: 0 | 70%-80%: 20 | 80%-90%: 60 | 90%-95%: 80 | >95%: 100
    case 'CAT_ALUMNI': {
      const { score, explanation } = calculateMentorshipOrAlumniScore(numAchievement);
      return {
        categoryCode,
        maxMarks: 100,
        calculatedScore: score,
        explanation: `Alumni engagement via Vaave: ${numAchievement}% -> ${explanation}`,
        isEligible: score > 0,
      };
    }

    // 16. Event Coordination (Max 40)
    // Min. 1 seminar/workshop/FDP/event per semester.
    // 1st: 15 | 2nd: 15 | 3rd: 10 (Max 40)
    case 'CAT_EVENT_COORD': {
      const events = Math.max(0, Math.floor(numAchievement));
      let score = 0;
      if (events === 1) score = 15;
      else if (events === 2) score = 30; // 15 + 15
      else if (events >= 3) score = 40; // 15 + 15 + 10 (Max 40)

      return {
        categoryCode,
        maxMarks: 40,
        calculatedScore: score,
        explanation: `${events} Event(s) coordinated: ${score} marks awarded (1st: 15, 2nd: 15, 3rd: 10, Max 40).`,
        isEligible: events >= 1,
      };
    }

    // 17. Admin Responsibilities (Max 40) - Binary (100% = 40, else 0)
    case 'CAT_ADMIN_RESP': {
      const isHundred = numAchievement >= 100;
      return {
        categoryCode,
        maxMarks: 40,
        calculatedScore: isHundred ? 40 : 0,
        explanation: isHundred
          ? '100% assigned administrative duties completed within timeline: Full 40 marks awarded'
          : `${numAchievement}% completed. 100% required for binary 40 marks.`,
        isEligible: isHundred,
      };
    }

    // Default fallback (e.g. for dynamic HOD / HOI custom categories)
    default: {
      const max = details.maxMarks || 100;
      const score = Math.min(numAchievement, max);
      return {
        categoryCode,
        maxMarks: max,
        calculatedScore: score,
        explanation: `Claimed score: ${score} / ${max}`,
        isEligible: score > 0,
      };
    }
  }
}
