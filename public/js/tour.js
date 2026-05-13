/**
 * Popopen guided tour — powered by Shepherd.js
 * Loaded as an ES module so it doesn't block the main bundle.
 * Exposes window.Tour.start() for the manual help button.
 */

const SHEPHERD_ESM = 'https://cdn.jsdelivr.net/npm/shepherd.js/dist/js/shepherd.mjs';
const SEEN_KEY     = 'popopen-tour-seen';

// Auto-start delay (ms) — lets the intro animation finish and skills load
const AUTO_DELAY = 2400;

function buildTour(Shepherd) {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: false,
      popperOptions: {
        modifiers: [{ name: 'offset', options: { offset: [0, 14] } }],
      },
    },
  });

  const next = () => tour.next();
  const back = () => tour.back();

  function step(id, title, text, attachTo, extraButtons) {
    const buttons = [
      { text: 'Back', action: back,  classes: 'shep-btn-secondary' },
      { text: 'Next',  action: next, classes: 'shep-btn-primary'   },
      ...(extraButtons || []),
    ];

    tour.addStep({
      id,
      title,
      text,
      ...(attachTo ? { attachTo } : {}),
      buttons,
    });
  }

  // Step 1 — Welcome
  tour.addStep({
    id: 'welcome',
    title: 'Welcome to Popopen 👋',
    text: "Let's take a quick look around. Takes about 30 seconds.",
    buttons: [
      { text: 'Skip',        action: () => tour.cancel(), classes: 'shep-btn-secondary' },
      { text: "Let's go →",  action: next,                classes: 'shep-btn-primary'   },
    ],
  });

  // Step 2 — Skill tree
  step(
    'skill-tree',
    'Your Skills',
    'All your Claude skills live here. Click a folder to expand it and see its files.',
    { element: '#skill-tree', on: 'right' }
  );

  // Step 3 — Scope badges
  step(
    'scope-badges',
    'Installed vs Custom',
    '<b>IN</b> skills came from the Claude Code CLI. <b>CU</b> skills are ones you made yourself.',
    { element: '#skill-tree', on: 'right' }
  );

  // Step 4 — Quick toggle dot
  step(
    'toggle',
    'Turn Skills On or Off',
    'The dot next to each skill is a quick on/off switch. <span style="color:#30D158;font-size:1.1em">&#9679;</span> active &nbsp;·&nbsp; <span style="color:#888;font-size:1.1em">&#9676;</span> paused. Claude won\'t use a paused skill, but it stays installed.',
    { element: '#skill-tree', on: 'right' }
  );

  // Step 5 — Search
  step(
    'search',
    'Search',
    'Find anything across all your skills — content, settings, filenames. Press <kbd>⌘K</kbd> to jump straight here.',
    { element: '#search-container', on: 'right' }
  );

  // Step 6 — Content area
  tour.addStep({
    id: 'content-area',
    title: 'Reading & Editing',
    text: 'Click any skill in the sidebar to open it here. Switch between <b>Content</b> and <b>Permissions</b> tabs. Hit <b>Edit</b> to make changes — you\'ll review a diff before anything saves.',
    buttons: [
      { text: 'Back', action: back, classes: 'shep-btn-secondary' },
      { text: 'Next',  action: next, classes: 'shep-btn-primary'   },
    ],
  });

  // Step 8 — Theme toggle
  step(
    'Appearance',
    'Light, Dark, or Auto',
    'Switch between light and dark mode, or let it match your system.',
    { element: '#theme-toggle', on: 'top' }
  );

  // Step 9 — Help button
  tour.addStep({
    id: 'done',
    title: "That's it!",
    text: "You're all set. Press this button anytime to bring this tour back.",
    attachTo: { element: '#help-btn', on: 'top' },
    buttons: [
      { text: '← Back', action: back,                  classes: 'shep-btn-secondary' },
      { text: 'Done ✓',  action: () => tour.complete(), classes: 'shep-btn-primary'   },
    ],
  });

  return tour;
}

async function loadShepherd() {
  try {
    const mod = await import(SHEPHERD_ESM);
    return mod.default ?? mod.Shepherd ?? mod;
  } catch (err) {
    console.warn('[Tour] Failed to load Shepherd.js:', err);
    return null;
  }
}

async function start() {
  const Shepherd = await loadShepherd();
  if (!Shepherd) return;
  buildTour(Shepherd).start();
}

async function maybeAutoStart() {
  if (localStorage.getItem(SEEN_KEY)) return;
  localStorage.setItem(SEEN_KEY, '1');

  // Wait for intro animation to finish and sidebar to populate
  await new Promise(r => setTimeout(r, AUTO_DELAY));
  await start();
}

// Wire up the help button (DOM may or may not be ready yet)
function bindHelpButton() {
  const btn = document.getElementById('help-btn');
  if (btn) {
    btn.addEventListener('click', start);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('help-btn')?.addEventListener('click', start);
    });
  }
}

bindHelpButton();
document.addEventListener('DOMContentLoaded', maybeAutoStart);

// Expose for any external callers
window.Tour = { start };
