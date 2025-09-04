import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // currencies & items
      coins: 0,
      bones: 0,
      fish: 0,
      inventory: [], // {id, name, type:'hat'|'collar'|'toy', cost, owned:boolean}
      pet: { kind: 'dog', name: 'Buddy', cosmetics: { hat: null, collar: null } },

      addCoins: (n) => set((s) => ({ coins: s.coins + n })),
      spendCoins: (n) => set((s) => ({ coins: Math.max(0, s.coins - n) })),
      addItem: (item) => set((s) => ({ inventory: [...s.inventory, item] })),
      equip: (slot, itemId) =>
        set((s) => ({ pet: { ...s.pet, cosmetics: { ...s.pet.cosmetics, [slot]: itemId } } })),

      // quiz rules
      quiz: {
        lastDailyISO: null,   // track last completion
        dailyDone: false,
        lectureCountWeek: 0,  // 0..2
        weekISO: null,        // which week the count belongs to
      },
      markDailyQuizDone: () => set(() => ({
        quiz: { ...get().quiz, dailyDone: true, lastDailyISO: new Date().toISOString() }
      })),
      resetDailyIfNewDay: () => set((s) => {
        const today = new Date().toDateString();
        const last = s.quiz.lastDailyISO ? new Date(s.quiz.lastDailyISO).toDateString() : null;
        return last !== today ? { quiz: { ...s.quiz, dailyDone: false } } : {};
      }),
      incLectureQuiz: () => set((s) => {
        const now = new Date();
        const weekISO = `${now.getUTCFullYear()}-W${getWeekNumber(now)}`;
        const isNewWeek = s.quiz.weekISO !== weekISO;
        const newCount = (isNewWeek ? 0 : s.quiz.lectureCountWeek) + 1;
        return { quiz: { ...s.quiz, lectureCountWeek: Math.min(2, newCount), weekISO } };
      }),
    }),
    { name: 'powerup-store' }
  )
);

// helper
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

export default useStore;
