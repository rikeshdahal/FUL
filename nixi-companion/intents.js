/*
  Nixi offline intent parser.

  Turns a spoken sentence into a concrete action without needing the internet.
  The cloud model is used for anything fuzzy; everything in this file works
  with the network unplugged.
*/

const NUM_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, couple: 2, few: 3, half: 0.5,
};

const UNIT_SECONDS = {
  second: 1, seconds: 1, sec: 1, secs: 1, s: 1,
  minute: 60, minutes: 60, min: 60, mins: 60, m: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600, h: 3600,
};

const clean = s => String(s || '').toLowerCase().replace(/[.!?,;:"'`]/g, ' ').replace(/\s+/g, ' ').trim();

function toNumber(word) {
  if (word == null) return null;
  const w = String(word).trim();
  if (/^\d+(\.\d+)?$/.test(w)) return parseFloat(w);
  if (NUM_WORDS[w] != null) return NUM_WORDS[w];
  return null;
}

/** "1 hour 30 minutes" / "ten mins" / "half an hour" / "5m" -> seconds */
function parseDuration(text) {
  const t = ' ' + clean(text) + ' ';
  if (/\bhalf an hour\b/.test(t)) return 1800;

  // Check compact digits like "5m", "10min", "30s", "1h" first
  const compactMatch = t.match(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/i);
  if (compactMatch) {
    const val = parseFloat(compactMatch[1]);
    const uKey = compactMatch[2].toLowerCase();
    const unit = UNIT_SECONDS[uKey] ?? UNIT_SECONDS[uKey.replace(/s$/, '')];
    if (unit != null) return Math.round(val * unit);
  }

  const re = /(\d+(?:\.\d+)?|[a-z]+(?:\s+an?)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g;
  let m, total = 0, found = false;
  while ((m = re.exec(t))) {
    let n = toNumber(m[1].trim().replace(/\s+an?$/, ''));
    if (n == null) {
      const parts = m[1].trim().split(/\s+/);
      n = toNumber(parts[parts.length - 1]);
    }
    if (n == null) continue;
    const uKey = m[2].toLowerCase();
    const unit = UNIT_SECONDS[uKey] ?? UNIT_SECONDS[uKey.replace(/s$/, '')];
    if (unit == null) continue;
    total += n * unit;
    found = true;
  }
  if (!found) {
    const bare = t.match(/\b(\d+)\b/);
    if (bare) { total = parseInt(bare[1], 10) * 60; found = true; }
  }
  return found ? Math.round(total) : null;
}

/** "at 6", "at 6 pm", "at 18:30" -> Date */
function parseClockTime(text) {
  const t = clean(text);
  let m = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3];
  if (h > 23) return null;
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  if (!mer && h <= 7) h += 12; // "at 6" means 18:00
  const d = new Date();
  d.setHours(h, min, 0, 0);
  if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
  return d;
}

function splitItems(text) {
  return String(text || '')
    .split(/\s*(?:,|\band\b|&|\bplus\b)\s*/i)
    .map(s => s.replace(/^(the |my |an? |app |program |website |site )/i, '').trim())
    .filter(Boolean);
}

function stripLead(text, re) {
  return String(text || '').replace(re, '').replace(/^\s*(me|please|can you|could you|i want to|i'd like to|would you)\s+/i, '').trim();
}

const THANK = /\b(thank you|thanks|thx|ta|cheers|great job|nice job|good job|awesome|perfect|lovely|you'?re the best|good girl|good boy)\b/i;

const INTENTS = [
  {
    id: 'conversation',
    test: /\b(?:how are you|how'?s it going|how are you doing|how do you do|what'?s up|sup\b|who are you|what is your name|what can you do|what are you|help me|tell me a joke|tell a joke|give me a joke|joke\b|are you real|who made you|who created you|good (?:morning|afternoon|evening|night)|hello|hi\b|hey\b|greetings)\b/i,
    run: t => {
      if (/\b(?:how are you|how'?s it going|how are you doing|how do you do)\b/i.test(t)) {
        return {
          id: 'conversation',
          args: { text: "I'm doing great, thank you! Ready to help you with your PC. What would you like to do?" },
          say: "I'm doing great, thank you! What would you like to do?"
        };
      }
      if (/\b(?:what'?s up|sup)\b/i.test(t)) {
        return {
          id: 'conversation',
          args: { text: "Not much, just chilling here on your screen! Tell me what you need." },
          say: "Not much, just chilling here on your screen! Tell me what you need."
        };
      }
      if (/\b(?:who are you|what is your name|what are you)\b/i.test(t)) {
        return {
          id: 'conversation',
          args: { text: "I'm Nixi, your personal desktop companion and voice assistant. I live right here on your screen to help you launch apps, search, manage timers, play music, and answer questions." },
          say: "I'm Nixi, your desktop voice assistant."
        };
      }
      if (/\b(?:what can you do|help me|help\b)\b/i.test(t)) {
        return {
          id: 'conversation',
          args: { text: "I can open apps and websites (like Google, TikTok, YouTube), run web searches, execute multiple tasks at once, set timers and reminders, control your music and volume, take screenshots, and answer your questions!" },
          say: "I can open apps, search the web, manage timers, play music, and answer your questions!"
        };
      }
      if (/\b(?:tell me a joke|tell a joke|give me a joke|joke)\b/i.test(t)) {
        const jokes = [
          "Why did the computer catch a cold? Because it left its Windows open!",
          "There are 10 types of people in the world: those who understand binary, and those who don't.",
          "Why do programmers prefer dark mode? Because light attracts bugs!",
          "I asked my computer for a joke, and it showed me my internet history."
        ];
        const j = jokes[Math.floor(Math.random() * jokes.length)];
        return { id: 'conversation', args: { text: j }, say: j };
      }
      if (/\b(?:good morning)\b/i.test(t)) {
        return { id: 'conversation', args: { text: "Good morning! Ready to tackle the day together. What can I do for you?" }, say: "Good morning! How can I help you today?" };
      }
      if (/\b(?:good evening|good afternoon)\b/i.test(t)) {
        return { id: 'conversation', args: { text: "Good evening! Hope you had a productive day. What can I do for you?" }, say: "Good evening! How can I help you?" };
      }
      if (/\b(?:good night)\b/i.test(t)) {
        return { id: 'conversation', args: { text: "Good night! Rest well and see you tomorrow." }, say: "Good night! Sleep well." };
      }
      if (/\b(?:hello|hi|hey|greetings)\b/i.test(t)) {
        return { id: 'conversation', args: { text: "Hey there! How can I help you today?" }, say: "Hey there! What can I do for you?" };
      }
      if (/\b(?:who made you|who created you)\b/i.test(t)) {
        return { id: 'conversation', args: { text: "I was created by Rikesh to be your smart, fast, and friendly desktop companion." }, say: "I was created by Rikesh to be your desktop companion." };
      }
      return null;
    }
  },
  {
    id: 'search_on_combined',
    test: /\b(?:open|launch|go to)\s+([a-z0-9_ -]+?)\s+and\s+(?:then\s+)?search(?:\s+for)?\s+(.+)$/i,
    run: t => {
      const m = t.match(/\b(?:open|launch|go to)\s+([a-z0-9_ -]+?)\s+and\s+(?:then\s+)?search(?:\s+for)?\s+(.+)$/i);
      if (!m) return null;
      const platform = m[1].trim();
      const query = m[2].replace(/[.!?]+$/, '').trim();
      return { id: 'search_on', args: { platform, query }, say: `Searching ${platform} for “${query}”.` };
    }
  },
  {
    id: 'search_on_direct',
    test: /\bsearch(?:\s+for)?\s+(.+?)\s+on\s+([a-z0-9_ -]+)$/i,
    run: t => {
      const m = t.match(/\bsearch(?:\s+for)?\s+(.+?)\s+on\s+([a-z0-9_ -]+)$/i);
      if (!m) return null;
      const query = m[1].replace(/^(for|about)\s+/i, '').replace(/[.!?]+$/, '').trim();
      const platform = m[2].trim();
      return { id: 'search_on', args: { platform, query }, say: `Searching ${platform} for “${query}”.` };
    }
  },
  {
    id: 'thanks',
    test: THANK,
    run: () => ({ id: 'thanks', args: {}, say: null })
  },
  {
    id: 'time_date',
    test: /\b(?:what(?:'?s| is) the time|what time is it|tell me the time|current time|what(?:'?s| is) the date|what day is (?:it|today)|what'?s today|today'?s date|what(?:'?s| is) today'?s date)\b/i,
    run: t => ({ id: 'time_date', args: { date: /\b(date|day|today)\b/i.test(t) }, say: null })
  },
  {
    id: 'cancel_timer',
    test: /\b(cancel|stop|clear|delete)\b[^.]*\b(timers?|reminders?|alarms?)\b/i,
    run: t => ({ id: 'cancel_timer', args: { all: /\ball\b/i.test(t) }, say: 'Cancelled.' })
  },
  {
    id: 'list_timers',
    test: /\b(?:what(?:'?s| is| are)?|show|list|any)\b[^.]*\b(?:timers?|reminders?|alarms?)\b/i,
    run: () => ({ id: 'list_timers', args: {}, say: null })
  },
  {
    id: 'set_timer',
    test: /\b(?:set\s+(?:a\s+)?timer|timer\b|start\s+(?:a\s+)?timer|countdown|\d+\s*(?:m|min|mins|minutes|h|hr|hrs|s|sec|secs)\s+timer)\b/i,
    run: t => {
      const secs = parseDuration(t);
      if (secs == null) return null;
      let label = t.replace(/\b(?:set\s+(?:a\s+)?timer|start\s+(?:a\s+)?timer|timer\s+for|timer\s+of|timer|countdown|for|in|to)\b/gi, ' ').trim();
      label = label.replace(/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi, ' ').trim();
      label = label.replace(/\s+/g, ' ').trim();
      return { id: 'set_timer', args: { seconds: secs, label: label || 'Timer' }, say: `Timer set for ${humanDuration(secs)}.` };
    }
  },
  {
    id: 'set_reminder',
    test: /\b(?:remind\s+me|reminder|alarm|don'?t\s+let\s+me\s+forget)\b/i,
    run: t => {
      let text = '';
      const m = t.match(/\b(?:remind\s+me|reminder|alarm)\b(.*)/i);
      const tail = m ? m[1] : t;
      const atM = tail.match(/\b(?:at|by)\b\s*([^,]+?)(?=\s+(?:to|that|and)\b|$)/i);
      let when = null, minutes = null, whenText = '';
      if (atM) {
        whenText = atM[1].trim();
        when = parseClockTime(whenText);
      }
      const inM = tail.match(/\bin\s+([\w\s]+?)(?=\s+(?:to|that|and|about)\b|$)/i);
      if (!when && inM) {
        const secs = parseDuration(inM[1]);
        if (secs) { minutes = Math.round(secs / 60); whenText = inM[1].trim(); when = new Date(Date.now() + secs * 1000); }
      }
      const textM = tail.match(/\b(?:to|that|about)\s+(.+)$/i);
      text = (textM ? textM[1] : tail).replace(/[.!?]+$/, '').trim();
      if (whenText) {
        const at = text.toLowerCase().indexOf(whenText.toLowerCase());
        if (at >= 0) text = (text.slice(0, at) + text.slice(at + whenText.length)).trim();
        text = text.replace(/\s*\b(?:at|by|in)\s*$/i, '').trim();
      }
      if (!text) text = 'Reminder';
      return { id: 'set_reminder', args: { text, time: whenText || undefined, minutes: minutes || undefined, at: when ? when.getTime() : undefined }, say: `Reminder set: ${text}.` };
    }
  },
  {
    id: 'todo_add',
    test: /\b(?:add|put|append|create)\b[^.]*\b(?:to|on)\b[^.]*\b(?:list|todo|to-?do|tasks?)\b/i,
    run: t => {
      const m = t.match(/\b(?:add|put|append|create)\s+(.+?)\s+(?:to|on)\b/i);
      if (!m) return null;
      const item = m[1].replace(/^(a |an |the |my )/i, '').trim();
      if (!item) return null;
      return { id: 'todo_add', args: { item }, say: `Added ${item}.` };
    }
  },
  {
    id: 'todo_list',
    test: /\b(?:what(?:'?s| is| are)?\s+(?:on|in)?\s*(?:my|the)?\s*(?:list|todo|to-?do|tasks?)\b|(?:show|read|open|list)\s+(?:my|the)?\s*(?:list|todo|to-?do|tasks?)\b|what do i need to do\b)/i,
    run: () => ({ id: 'todo_list', args: {}, say: null })
  },
  {
    id: 'todo_remove',
    test: /\b(?:remove|delete|take off|cross off|check off|drop)\b[^.]*\b(?:from|off)\b[^.]*\b(?:list|todo|to-?do|tasks?)\b/i,
    run: t => {
      const m = t.match(/\b(?:remove|delete|take off|cross off|check off|drop)\s+(.+?)\s+from\b/i);
      if (!m) return null;
      const item = m[1].replace(/^(the |a |an |my )/i, '').trim();
      return { id: 'todo_remove', args: { item }, say: `Removed ${item}.` };
    }
  },
  {
    id: 'todo_clear',
    test: /\b(?:clear|empty|wipe|reset)\b[^.]*\b(?:list|todo|to-?do|tasks?)\b/i,
    risky: true,
    run: () => ({ id: 'todo_clear', args: {}, say: 'List cleared.' })
  },
  {
    id: 'note',
    test: /\b(?:take|make|save|add|write|create|jot)\b[^.]*\bnote\b|\bnote\s+(?:that|to)\b|\bremember that\b/i,
    run: t => {
      const m = t.match(/\b(?:note that|note to|jot down|remember that)\s+(.+)$/i) ||
        t.match(/\b(?:take|make|save|add|write|create)\s+(?:a\s+)?note(?:\s+(?:that|to|about))?\s*(.*)$/i);
      const text = (m ? (m[1] || '') : t).replace(/[.!?]+$/, '').trim();
      if (!text) return null;
      return { id: 'note', args: { text }, say: 'Noted.' };
    }
  },
  {
    id: 'now_playing',
    test: /\bwhat(?:'?s| is) playing\b|\bwhat song is this\b|\bcurrent (?:song|track|music)\b/i,
    run: () => ({ id: 'now_playing', args: {}, say: null })
  },
  {
    id: 'open_music_ui',
    test: /\b(?:music|music player|show music|open music|play song)\b/i,
    run: () => ({ id: 'open_music_ui', args: {}, say: null })
  },
  {
    id: 'play_on',
    test: /\bplay\b[^.]*\bon\s+(spotify|apple music|youtube music|youtube|netflix|twitch|amazon music)\b/i,
    run: t => {
      const m = t.match(/\bon\s+(spotify|apple music|youtube music|youtube|netflix|twitch|amazon music)\b/i);
      return { id: 'open_app', args: { names: [m[1]] }, say: `Playing on ${m[1]}.` };
    }
  },
  {
    id: 'media',
    test: /\b(?:next|previous|prev|last|skip|pause|resume|play|stop)\b[^.]*\b(?:song|track|music|media|video|episode)\b/i,
    run: t => {
      let action = 'playpause';
      if (/\bnext\b|\bskip\b/.test(t)) action = 'next';
      else if (/\b(?:previous|prev|last)\b/.test(t)) action = 'prev';
      else if (/\bpause\b/.test(t)) action = 'pause';
      else if (/\bresume\b|\bplay\b/.test(t)) action = 'play';
      else if (/\bstop\b/.test(t)) action = 'stop';
      return { id: 'media', args: { action }, say: null };
    }
  },
  {
    id: 'volume_set',
    test: /\bvolume\s+(?:to\s+)?(\d{1,3})\s*(?:%|percent)/i,
    run: t => {
      const m = t.match(/(\d{1,3})\s*(?:%|percent)/);
      if (!m) return null;
      const v = Math.max(0, Math.min(100, parseInt(m[1], 10)));
      return { id: 'volume_set', args: { value: v }, say: `Volume ${v}%.` };
    }
  },
  {
    id: 'volume',
    test: /\b(?:louder|volume up|turn (?:it|the volume) up|raise the volume|increase the volume|pump it up|quieter|softer|volume down|turn (?:it|the volume) down|lower the volume|decrease the volume|mute|unmute|silence)\b/i,
    run: t => {
      if (/\bmute\b|\bsilence\b/i.test(t)) return { id: 'volume', args: { action: 'mute' }, say: 'Muted.' };
      if (/\bunmute\b/i.test(t)) return { id: 'volume', args: { action: 'unmute' }, say: 'Unmuted.' };
      const down = /\b(quieter|softer|volume down|turn (?:it|the volume) down|lower the volume|decrease the volume)\b/i.test(t);
      const step = (t.match(/(\d{1,2})\s*(?:percent|%)/i) || [])[1];
      return { id: 'volume', args: { action: down ? 'down' : 'up', amount: step ? parseInt(step, 10) : 5 }, say: down ? 'Volume down.' : 'Volume up.' };
    }
  },
  {
    id: 'dark_mode',
    test: /\b(?:dark mode|light mode|lights? (?:on|off)|theme)\b/i,
    run: t => {
      let enable = true;
      if (/\blight mode\b/i.test(t)) enable = false;
      else if (/\bdark mode\b/i.test(t)) enable = true;
      else if (/\blights? off\b|\bturn (?:it )?off\b/i.test(t)) enable = false;
      else if (/\blights? on\b|\bturn (?:it )?on\b/i.test(t)) enable = true;
      return { id: 'dark_mode', args: { enable }, say: enable ? 'Dark mode on.' : 'Light mode on.' };
    }
  },
  {
    id: 'find_file',
    test: /\b(?:find|locate|look for|search for|where is|where'?s)\b[^.]*\b(?:file|document|folder|resume|cv|pdf|spreadsheet|folder)\b|^\s*find my\b/i,
    run: t => {
      const m = t.match(/\b(?:find|locate|look for|search for|where is|where'?s)\s+(?:my|the)?\s*(.+?)(?:\s+(?:file|document|folder|please))?$/i);
      if (!m) return null;
      const q = m[1].replace(/[.!?]+$/, '').trim();
      if (!q || q.length < 2) return null;
      return { id: 'find_file', args: { query: q }, say: null };
    }
  },
  {
    id: 'teleprompter',
    test: /\b(?:start\s+)?teleprompter\b|\bread (?:this )?script\b|\bscript mode\b/i,
    run: t => {
      const m = t.match(/\bteleprompter\b[:\s]+(.*)$/i) || t.match(/\b(?:read|start) (?:this )?script\b[:\s]*(.*)$/i);
      const script = m ? m[1].trim() : '';
      return { id: 'teleprompter', args: { script }, say: null };
    }
  },
  {
    id: 'screen',
    test: /\b(?:what(?:'?s| is) on my screen|summar(?:ize|ise) (?:this|the) (?:page|screen|window|article|error)|read (?:my|the|this) screen|what does (?:this|the) (?:error|message) (?:say|mean)|what'?s (?:this|on) (?:the )?screen)\b/i,
    run: () => ({ id: 'screen', args: {}, say: null })
  },
  {
    id: 'write',
    test: /\b(?:write|draft|compose|create)\b[^.]*\b(?:note|email|mail|reply|message|post|message|text|paragraph|essay|summar(?:y|ise)|letter)\b|^\s*write\b/i,
    run: t => {
      const m = t.match(/^\s*(?:write|draft|compose)\s+(.*)$/i);
      const what = m ? m[1].trim() : t;
      return { id: 'write', args: { request: what }, say: null };
    }
  },
  {
    id: 'calculate',
    test: /\b(?:calculate|compute|what(?:'?s| is)|how much is|solve|work out)\b/i,
    run: t => {
      const norm = t
        .replace(/\bplus\b|\band\b/g, '+')
        .replace(/\bminus\b|\bless\b/g, '-')
        .replace(/\btimes\b|\bmultiplied by\b/g, '*')
        .replace(/\bdivided by\b|\bover\b/g, '/')
        .replace(/\bsquared\b/g, '^2')
        .replace(/(\d)\s*x\s*(\d)/g, '$1*$2');
      const m = norm.match(/([\d\s().,+\-*/^%]*[\d][\d\s().,+\-*/^%]*)/);
      if (!m) return null;
      const expr = m[1].replace(/,/g, '').trim();
      if (!/[+\-*/^%]/.test(expr)) return null;
      if (!/\d/.test(expr)) return null;
      return { id: 'calculate', args: { expression: expr }, say: null };
    }
  },
  {
    id: 'lock',
    test: /\block (?:my |the )?(?:pc|computer|screen|workstation)\b/i,
    risky: true,
    run: () => ({ id: 'lock', args: {}, say: 'Locking.' })
  },
  {
    id: 'screenshot',
    test: /\b(?:take a |grab a |capture a )?screenshot\b/i,
    run: () => ({ id: 'screenshot', args: {}, say: null })
  },
  {
    id: 'clipboard_paste',
    test: /\bpaste (?:the )?clipboard\b|\bpaste\b/i,
    run: () => ({ id: 'clipboard_paste', args: {}, say: null })
  },
  {
    id: 'clipboard_copy',
    test: /\b(?:copy|what(?:'?s| is) on) (?:the )?clipboard\b/i,
    run: () => ({ id: 'clipboard_read', args: {}, say: null })
  },
  {
    id: 'browser_new_tab',
    test: /\b(?:open a |new )?new tab\b/i,
    run: () => ({ id: 'browser_action', args: { action: 'new_tab' }, say: null })
  },
  {
    id: 'browser_close_tab',
    test: /\bclose (?:this|the|my) tab\b/i,
    run: () => ({ id: 'browser_action', args: { action: 'close_tab' }, say: null })
  },
  {
    id: 'zoom',
    test: /\bzoom (?:in|out)\b/i,
    run: t => ({ id: 'browser_action', args: { action: /\bout\b/i.test(t) ? 'zoom_out' : 'zoom_in' }, say: null })
  },
  {
    id: 'scroll',
    test: /\b(?:scroll|page|page down|page up)\s*(?:up|down)\b/i,
    run: t => ({ id: 'browser_action', args: { action: /\bup\b/i.test(t) ? 'scroll_up' : 'scroll_down' }, say: null })
  },
  {
    id: 'refresh',
    test: /\b(?:refresh|reload)\b/i,
    run: () => ({ id: 'browser_action', args: { action: 'refresh' }, say: null })
  },
  {
    id: 'web_search',
    test: /\b(?:search (?:the web|for|google)|google|look up|search online|web search)\b/i,
    run: t => {
      const m = t.match(/\b(?:search(?: the web)?(?: for)?|google|look up|web search)\s+(.+)$/i);
      const q = m ? m[1].replace(/^(for|about|on)\s+/i, '').replace(/[.!?]+$/, '').trim() : '';
      if (!q) return null;
      return { id: 'web_search', args: { query: q }, say: `Searching for ${q}.` };
    }
  },
  {
    id: 'open_url',
    test: /\b(?:open|go to|visit|browse)\b\s*((?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:[\/\?#]\S*)?)/i,
    run: t => {
      const m = t.match(/((?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:[\/\?#]\S*)?)/);
      if (!m) return null;
      const url = m[1];
      if (!/\.[a-z]{2,}/i.test(url)) return null;
      return { id: 'open_url', args: { url }, say: `Opening ${url}.` };
    }
  },
  {
    id: 'open_app',
    test: /\b(?:open|launch|start|run|fire up|bring up)\b\s+(.+)$/i,
    run: t => {
      let what = stripLead(t, /\b(?:open|launch|start|run|fire up|bring up)\b/i);
      what = what.replace(/\b(?:for me|please|right now|now)\b/gi, '').trim();
      what = what.replace(/[.!?]+$/, '').trim();
      if (!what) return null;
      const names = splitItems(what);
      if (!names.length) return null;
      return { id: 'open_app', args: { names }, say: `Opening ${names.join(', ')}.` };
    }
  },
];

function humanDuration(secs) {
  if (secs < 60) return `${secs} second${secs === 1 ? '' : 's'}`;
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hour${h === 1 ? '' : 's'} ${r} min` : `${h} hour${h === 1 ? '' : 's'}`;
}

function matchSingle(text) {
  const raw = String(text || '').trim();
  const t = clean(text);
  if (!t) return null;

  // URLs have to be read from the raw text, clean() would eat the dots.
  const urlM = raw.match(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
  if (urlM && /\b(?:open|go to|visit|browse|launch|start|navigate to)\b/i.test(raw)) {
    const u = urlM[1];
    if (!/\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|png|jpe?g|gif|mp4|mp3|exe|msi)$/i.test(u)) {
      return { id: 'open_url', args: { url: u }, say: `Opening ${u}.`, category: 'task', risky: false };
    }
  }

  for (const intent of INTENTS) {
    if (!intent.test.test(t)) continue;
    const out = intent.run(t);
    if (out) {
      const isQ = ['conversation', 'time_date', 'list_timers', 'list_notes', 'calculate', 'system_info', 'todo_list', 'thanks'].includes(out.id);
      return { ...out, category: isQ ? 'question' : 'task', risky: !!intent.risky };
    }
  }
  return null;
}

function match(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  // 1) First check compound commands separated by "and then", "then", or ";"
  if (/\s+(?:and then|then|;)\s+/i.test(raw)) {
    const parts = raw.split(/\s+(?:and then|then|;)\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const sub = [];
      for (const p of parts) {
        const item = matchSingle(p);
        if (item) sub.push(item);
      }
      if (sub.length === parts.length) {
        return {
          id: 'compound',
          args: { actions: sub },
          category: 'task',
          say: sub.map(s => s.say).filter(Boolean).join(' ') || 'Done.'
        };
      }
    }
  }

  // 2) Check if connected by " and " where both parts are distinct actions (e.g. "open tiktok and open youtube" or "open google and mute")
  if (/\s+\band\b\s+/i.test(raw) && !/\bsearch\b/i.test(raw)) {
    const parts = raw.split(/\s+\band\b\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every(p => /\b(open|launch|start|run|close|mute|volume|set|remind|turn|dark mode|light mode)\b/i.test(p))) {
      const sub = [];
      for (const p of parts) {
        const item = matchSingle(p);
        if (item) sub.push(item);
      }
      if (sub.length === parts.length) {
        return {
          id: 'compound',
          args: { actions: sub },
          category: 'task',
          say: sub.map(s => s.say).filter(Boolean).join(' ') || 'Done.'
        };
      }
    }
  }

  return matchSingle(raw);
}

function classify(text) {
  const m = match(text);
  if (m) {
    const isQ = m.category === 'question' || ['conversation', 'time_date', 'list_timers', 'list_notes', 'calculate', 'system_info', 'todo_list', 'thanks'].includes(m.id);
    return {
      category: isQ ? 'question' : 'task',
      intent: { ...m, category: isQ ? 'question' : 'task' },
      thought: isQ ? 'Categorized: Question / Conversation' : `Categorized: Task (${m.id.replace(/_/g, ' ')})`
    };
  }
  const raw = String(text || '').trim();
  const isQ = /\?$/.test(raw) || /^(who|what|where|when|why|how|is|are|can|could|would|should|do|does|did|will|tell me|explain|define)\b/i.test(raw);
  const isT = /^(open|launch|start|run|close|kill|search|play|pause|stop|skip|mute|unmute|set|remind|turn|switch|create|delete|type|volume)\b/i.test(raw);
  return {
    category: isT ? 'task' : (isQ ? 'question' : 'question'),
    intent: null,
    thought: isT ? 'Categorized: Task' : 'Categorized: Question / Inquiry'
  };
}

module.exports = { match, classify, parseDuration, parseClockTime, splitItems, humanDuration, clean };

