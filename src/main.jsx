import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'tierraFleurCommandCenterV1';

const PLANT_CATEGORIES = [
  'Citrus',
  'Fruit Trees',
  'Berries',
  'Herbs and Tea Plants',
  'Roses',
  'Native Plants',
  'Annuals and Perennials',
  'Houseplants',
  'Seeds',
  'Landscape Supplies',
];

const categoryTitle = category => category === 'Citrus' ? 'Citrus Trees' : category;

const nurseryDefaults = {
  name: '',
  website: '',
  phone: '',
  email: '',
  location: '',
  sourceType: 'Online',
  categories: [],
  specialties: '',
  plants: '',
  shipsToDelaware: 'Ask nursery',
  wholesaleAvailability: 'Ask nursery',
  notes: '',
  favorite: false,
  approved: false,
  archived: false,
};

const curatedNurseries = [
  {
    id: 'nursery-georgia-grown-citrus',
    name: 'Georgia Grown Citrus',
    website: 'https://www.georgiagrowncitrus.com/',
    phone: '229-234-2797',
    email: 'georgiagrowncitrus@gmail.com',
    location: 'Ochlocknee, Georgia',
    sourceType: 'Both',
    categories: ['Citrus'],
    specialties: 'Cold-hardy, grafted citrus for homeowners and commercial growers',
    plants: 'Satsumas, mandarins, lemons, limes, kumquats, grapefruit, pummelo, citrus soil and supplies',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Available',
    notes: 'USDA-certified greenhouse. Delaware is within the nursery’s published shipping area; appointments are available for farm pickup.',
  },
  {
    id: 'nursery-stark-bros',
    name: "Stark Bro's",
    website: 'https://www.starkbros.com/',
    location: 'Louisiana, Missouri',
    sourceType: 'Online',
    categories: ['Fruit Trees', 'Berries'],
    specialties: 'Fruit trees and productive backyard orchard plants',
    plants: 'Apple, peach, pear, cherry, plum, nut trees, berries and garden supplies',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Long-established mail-order fruit nursery. Confirm current ship windows and Delaware hardiness before ordering.',
  },
  {
    id: 'nursery-nourse-farms',
    name: 'Nourse Farms',
    website: 'https://www.noursefarms.com/',
    phone: '877-632-3779',
    email: 'info@noursefarms.com',
    location: 'Whately, Massachusetts',
    sourceType: 'Online',
    categories: ['Berries', 'Fruit Trees'],
    specialties: 'Small-fruit plants for home gardens and commercial production',
    plants: 'Strawberries, raspberries, blueberries, blackberries, currants, gooseberries, elderberries and asparagus',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Available',
    notes: 'Seasonal dormant plant shipping. Strong option for larger berry plant quantities and grower guidance.',
  },
  {
    id: 'nursery-richters-herbs',
    name: 'Richters Herbs',
    website: 'https://www.richters.com/',
    location: 'Goodwood, Ontario; U.S. orders ship from Buffalo, New York',
    sourceType: 'Online',
    categories: ['Herbs and Tea Plants', 'Seeds'],
    specialties: 'Culinary, medicinal, aromatic and tea herbs',
    plants: 'Live herb plants, plug trays, seeds, rootstock, dried herbs and specialty collections',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Available',
    notes: 'U.S. plant shipments are inspected and include phytosanitary documentation. Live-plant shipping is seasonal.',
  },
  {
    id: 'nursery-heirloom-roses',
    name: 'Heirloom Roses',
    website: 'https://heirloomroses.com/',
    location: 'St. Paul, Oregon',
    sourceType: 'Online',
    categories: ['Roses'],
    specialties: 'Own-root roses and curated rose collections',
    plants: 'Climbing, shrub, floribunda, hybrid tea, English-style and fragrant roses',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Ships potted own-root roses. Check variety hardiness and current seasonal delivery timing.',
  },
  {
    id: 'nursery-prairie-moon',
    name: 'Prairie Moon Nursery',
    website: 'https://www.prairiemoon.com/',
    location: 'Winona, Minnesota',
    sourceType: 'Online',
    categories: ['Native Plants', 'Seeds', 'Annuals and Perennials'],
    specialties: 'North American native plants and ecological seed mixes',
    plants: 'Native seed, bare-root plants, potted plants, trays and restoration mixes',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Available',
    notes: 'Seeds ship year-round; live plants ship seasonally. Useful filters include state range, soil and light.',
  },
  {
    id: 'nursery-bluestone-perennials',
    name: 'Bluestone Perennials',
    website: 'https://www.bluestoneperennials.com/',
    location: 'Madison, Ohio',
    sourceType: 'Online',
    categories: ['Annuals and Perennials'],
    specialties: 'Mail-order perennials, shrubs, grasses and bulbs',
    plants: 'Flowering perennials, groundcovers, ornamental grasses, mums, shrubs and bulbs',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Family-run nursery with plants grown in biodegradable pots and seasonal delivery.',
  },
  {
    id: 'nursery-logees',
    name: "Logee's Plants",
    website: 'https://www.logees.com/',
    phone: '860-774-8038',
    location: 'Danielson, Connecticut',
    sourceType: 'Online',
    categories: ['Houseplants', 'Citrus', 'Herbs and Tea Plants', 'Fruit Trees'],
    specialties: 'Rare tropical, fruiting and greenhouse-grown plants',
    plants: 'Houseplants, begonias, citrus, figs, tropical fruit, jasmine, culinary plants and collector specimens',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Weather-aware year-round shipping from Connecticut. Especially useful for conservatory and indoor edible plants.',
  },
  {
    id: 'nursery-johnnys-seeds',
    name: "Johnny's Selected Seeds",
    website: 'https://www.johnnyseeds.com/',
    location: 'Winslow, Maine',
    sourceType: 'Online',
    categories: ['Seeds', 'Herbs and Tea Plants', 'Annuals and Perennials'],
    specialties: 'Professional-quality seed and growing tools',
    plants: 'Vegetable, herb, flower and microgreen seed; tools, trays and season-extension supplies',
    shipsToDelaware: 'Yes',
    wholesaleAvailability: 'Available',
    notes: 'Commercial grower resources and bulk quantities are available. Wholesale seed resale has separate qualification rules.',
  },
  {
    id: 'nursery-gateway-garden-center',
    name: 'Gateway Garden Center',
    website: 'https://gatewaygardens.com/',
    phone: '302-239-2727',
    email: 'info@gatewaygardens.com',
    location: '7277 Lancaster Pike, Hockessin, Delaware',
    sourceType: 'Local',
    categories: ['Native Plants', 'Annuals and Perennials', 'Houseplants', 'Landscape Supplies'],
    specialties: 'Regional native plants and ecologically friendly landscapes',
    plants: 'Native plants, trees, shrubs, perennials, annuals, houseplants and garden materials',
    shipsToDelaware: 'Local pickup',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Delaware source with a strong regional-native focus. Call ahead for project quantities and current inventory.',
  },
  {
    id: 'nursery-east-coast-garden-center',
    name: 'East Coast Garden Center',
    website: 'https://www.eastcoastgardencenter.com/',
    phone: '302-945-3489',
    location: '30366 Cordrey Road, Millsboro, Delaware',
    sourceType: 'Local',
    categories: ['Native Plants', 'Annuals and Perennials', 'Houseplants', 'Landscape Supplies'],
    specialties: 'Retail and wholesale nursery, containers, design and installation',
    plants: 'Trees, evergreens, shrubs, native plants, perennials, annuals, tropicals, houseplants and grasses',
    shipsToDelaware: 'Local pickup',
    wholesaleAvailability: 'Available',
    notes: 'Large Sussex County garden center and wholesale nursery. Good candidate for project-scale sourcing.',
  },
  {
    id: 'nursery-willey-farms',
    name: 'Willey Farms',
    website: 'https://www.willeyfarmsde.com/',
    phone: '302-378-8441',
    location: '4092 Dupont Parkway, Townsend, Delaware',
    sourceType: 'Local',
    categories: ['Annuals and Perennials', 'Houseplants', 'Herbs and Tea Plants', 'Landscape Supplies'],
    specialties: 'Year-round greenhouse, nursery and garden center',
    plants: 'Seasonal garden plants, greenhouse plants, herbs, vegetables, gifts and garden goods',
    shipsToDelaware: 'Local pickup',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Family-owned Delaware market and garden center. Call ahead for specialty plant availability.',
  },
  {
    id: 'nursery-old-country-gardens',
    name: 'Old Country Gardens',
    website: 'https://oldcountrygardens.com/',
    phone: '302-652-3317',
    location: '414 Wilson Road, Wilmington, Delaware',
    sourceType: 'Local',
    categories: ['Roses', 'Annuals and Perennials', 'Houseplants', 'Herbs and Tea Plants', 'Landscape Supplies'],
    specialties: 'Full-service garden center with indoor and outdoor plants',
    plants: 'Trees, annuals, perennials, roses, herbs, vegetables, tropicals, orchids, mulches, stone and pottery',
    shipsToDelaware: 'Local pickup',
    wholesaleAvailability: 'Ask nursery',
    notes: 'Broad New Castle County source for planting projects, containers and finishing materials.',
  },
].map(nursery => ({ ...nurseryDefaults, ...nursery }));

function inferNurseryCategories(item) {
  const text = `${item.name || ''} ${item.specialties || ''} ${item.products || ''} ${item.plants || ''}`.toLowerCase();
  const matches = [
    [/citrus|lemon|lime|satsuma|kumquat|mandarin/, 'Citrus'],
    [/fruit tree|orchard|apple|peach|pear|cherry|fig/, 'Fruit Trees'],
    [/berr|strawberr|raspberr|blueberr|blackberr|currant/, 'Berries'],
    [/herb|tea|medicinal|culinary/, 'Herbs and Tea Plants'],
    [/\brose/, 'Roses'],
    [/\bnative|ecological|restoration/, 'Native Plants'],
    [/annual|perennial|bulb|grass|groundcover/, 'Annuals and Perennials'],
    [/houseplant|tropical|indoor|begonia|orchid/, 'Houseplants'],
    [/\bseed|microgreen/, 'Seeds'],
    [/supply|supplies|mulch|stone|soil|pottery|hardscape/, 'Landscape Supplies'],
  ].filter(([pattern]) => pattern.test(text)).map(([, category]) => category);
  return matches.length ? matches : ['Annuals and Perennials'];
}

function normalizeNursery(item = {}) {
  const legacyNotes = [item.personalNotes, item.shippingNotes, item.pricingNotes, item.qualityNotes].filter(Boolean).join('\n');
  const categories = Array.isArray(item.categories) && item.categories.length ? item.categories.filter(category => PLANT_CATEGORIES.includes(category)) : inferNurseryCategories(item);
  return {
    ...nurseryDefaults,
    ...item,
    categories: categories.length ? categories : ['Annuals and Perennials'],
    plants: item.plants || item.products || '',
    notes: item.notes || legacyNotes,
    favorite: Boolean(item.favorite),
    approved: Boolean(item.approved),
    archived: Boolean(item.archived),
  };
}

function mergeNurserySeed(seed, saved) {
  if (!saved) return normalizeNursery(seed);
  const meaningfulSavedValues = Object.fromEntries(Object.entries(saved).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== '' && value !== null && value !== undefined;
  }));
  return normalizeNursery({ ...seed, ...meaningfulSavedValues });
}

const starter = {
  business: {
    name: 'Tierra Fleur Designs',
    tagline: 'Luxury edible landscape design for real-life spaces.',
    email: '',
    phone: '',
    address: '',
    defaultTax: 0,
  },
  clients: [],
  projects: [],
  expenses: [],
  estimates: [],
  tasks: [
    { id: crypto.randomUUID(), title: 'Add business contact information', due: '', done: false, priority: 'High' },
    { id: crypto.randomUUID(), title: 'Create standard service packages', due: '', done: false, priority: 'Medium' }
  ],
  services: [
    { id: crypto.randomUUID(), name: 'Garden Consultation', price: 125, unit: 'visit' },
    { id: crypto.randomUUID(), name: 'Edible Landscape Design', price: 450, unit: 'project' },
    { id: crypto.randomUUID(), name: 'Container Garden Installation', price: 275, unit: 'installation' },
  ],
  nurseries: curatedNurseries,
  plantSourcingVersion: 1,
  notes: '',
  learning: { history: [], completed: [], preferences: { level: 'Growing', focus: 'Business + Design' } },
};

function normalizeData(saved = {}) {
  const savedNurseries = Array.isArray(saved.nurseries) ? saved.nurseries : [];
  const needsPlantSourcingMigration = Number(saved.plantSourcingVersion || 0) < 1;
  const savedById = new Map(savedNurseries.map(nursery => [nursery.id, nursery]));
  const seededIds = new Set(curatedNurseries.map(nursery => nursery.id));
  const migratedNurseries = needsPlantSourcingMigration
    ? [
        ...curatedNurseries.map(nursery => mergeNurserySeed(nursery, savedById.get(nursery.id))),
        ...savedNurseries.filter(nursery => !seededIds.has(nursery.id)).map(normalizeNursery),
      ]
    : savedNurseries.map(normalizeNursery);
  return {
    ...starter,
    ...saved,
    nurseries: migratedNurseries,
    plantSourcingVersion: 1,
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return starter;
    return normalizeData(JSON.parse(raw));
  } catch {
    return starter;
  }
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState('dashboard');
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState({ status: 'Tap refresh', temp: null, detail: 'Location weather' });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const nav = (next) => { setView(next); setMenuOpen(false); };

  const refreshWeather = () => {
    setWeather({ status: 'Loading…', temp: null, detail: 'Finding your location' });
    if (!navigator.geolocation) {
      setWeather({ status: 'Unavailable', temp: null, detail: 'Geolocation is not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
        const res = await fetch(url);
        const json = await res.json();
        const c = json.current;
        setWeather({ status: 'Current weather', temp: Math.round(c.temperature_2m), detail: `Feels ${Math.round(c.apparent_temperature)}° • Wind ${Math.round(c.wind_speed_10m)} mph` });
      } catch {
        setWeather({ status: 'Weather error', temp: null, detail: 'Try again when connected' });
      }
    }, () => setWeather({ status: 'Location blocked', temp: null, detail: 'Allow location access in Safari settings' }), { enableHighAccuracy: false, timeout: 10000 });
  };

  return (
    <div className="app-shell">
      <div className="estate-bg" />
      <div className="estate-wash" />

      <header className="topbar glass">
        <button className="icon-button" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">☰</button>
        <div className="brand-block">
          <img className="crest-image" src="/assets/tierra-fleur-crest.jpeg" alt="Tierra Fleur Designs crest" />
          <div>
            <h1>Tierra Fleur Designs</h1>
            <p>Business Command Center</p>
          </div>
        </div>
        <div className="date-weather">
          <div className="clock">
            <strong>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
            <span>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <button className="weather-pill" onClick={refreshWeather}>
            <span>{weather.temp === null ? '☁︎' : `${weather.temp}°`}</span>
            <small>{weather.status}</small>
          </button>
        </div>
      </header>

      <aside className={`sidebar glass ${menuOpen ? 'open' : ''}`}>
        <nav>
          {[
            ['dashboard', '⌂', 'Dashboard'],
            ['clients', '♙', 'Clients'],
            ['projects', '✦', 'Projects'],
            ['sketch', '✎', 'Property Sketch'],
            ['money', '$', 'Expenses & Receipts'],
            ['estimates', '▤', 'Estimates & Invoices'],
            ['tasks', '✓', 'Tasks'],
            ['services', '❀', 'Services & Pricing'],
            ['plant-sourcing', '♧', 'Plant Sourcing'],
            ['learning', '✦', 'Live Learning Center'],
            ['settings', '⚙', 'Business Settings'],
          ].map(([id, icon, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => nav(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        {view === 'dashboard' && <Dashboard data={data} nav={nav} weather={weather} refreshWeather={refreshWeather} />}
        {view === 'clients' && <Clients items={data.clients} setItems={v => update('clients', v)} />}
        {view === 'projects' && <Projects items={data.projects} setItems={v => update('projects', v)} clients={data.clients} />}
        {view === 'sketch' && <SketchStudio projects={data.projects} />}
        {view === 'money' && <Expenses items={data.expenses} setItems={v => update('expenses', v)} />}
        {view === 'estimates' && <Estimates items={data.estimates} setItems={v => update('estimates', v)} clients={data.clients} services={data.services} business={data.business} />}
        {view === 'tasks' && <Tasks items={data.tasks} setItems={v => update('tasks', v)} />}
        {view === 'services' && <Services items={data.services} setItems={v => update('services', v)} />}
        {view === 'plant-sourcing' && <PlantSourcingDirectory items={data.nurseries} setItems={v => update('nurseries', v)} />}
        {view === 'learning' && <LearningCenter learning={data.learning || starter.learning} setLearning={v => update('learning', v)} />}
        {view === 'settings' && <Settings data={data} setData={setData} />}
      </main>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text, action }) {
  return <div className="section-title"><div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{action}</div>;
}

function Dashboard({ data, nav, weather, refreshWeather }) {
  const revenue = data.estimates.filter(x => x.status === 'Paid').reduce((sum, x) => sum + Number(x.total || 0), 0);
  const expenses = data.expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const openProjects = data.projects.filter(x => x.status !== 'Completed').length;
  const dueTasks = data.tasks.filter(x => !x.done).length;
  return <div className="page">
    <section className="hero-card glass">
      <div className="hero-copy">
        <img className="hero-crest" src="/assets/tierra-fleur-crest.jpeg" alt="Tierra Fleur Designs crest" />
        <span className="eyebrow">Your company, beautifully organized</span>
        <h2>Welcome to the Tierra Fleur command center.</h2>
        <p>Manage clients, projects, money, designs, documents, and daily priorities from one iPad-friendly workspace.</p>
        <div className="hero-actions"><button className="primary" onClick={() => nav('clients')}>Add a client</button><button onClick={() => nav('sketch')}>Open sketch studio</button></div>
      </div>
      <div className="weather-card">
        <span>{weather.status}</span>
        <strong>{weather.temp === null ? '—' : `${weather.temp}°F`}</strong>
        <p>{weather.detail}</p>
        <button onClick={refreshWeather}>Refresh weather</button>
      </div>
    </section>

    <section className="stat-grid">
      <Stat label="Active projects" value={openProjects} note={`${data.projects.length} total`} />
      <Stat label="Clients" value={data.clients.length} note="Saved contacts" />
      <Stat label="Paid revenue" value={money(revenue)} note="Recorded invoices" />
      <Stat label="Expenses" value={money(expenses)} note={`${data.expenses.length} entries`} />
      <Stat label="Open tasks" value={dueTasks} note="Needs attention" />
    </section>

    <section className="dashboard-grid">
      <div className="panel glass">
        <SectionTitle eyebrow="Quick launch" title="Run the business" text="Jump straight into the tools used most often." />
        <div className="quick-grid">
          {[
            ['New property sketch', 'Sketch over a client photo', 'sketch'],
            ['Record an expense', 'Attach and store a receipt', 'money'],
            ['Create an estimate', 'Build a professional client quote', 'estimates'],
            ['Plan a project', 'Track scope, dates, and status', 'projects'],
            ['Plant Sourcing', 'Search trusted growers and suppliers', 'plant-sourcing'],
            ['Start a live lesson', 'Fresh business and design learning', 'learning'],
          ].map(([title, text, target]) => <button key={title} onClick={() => nav(target)}><strong>{title}</strong><span>{text}</span></button>)}
        </div>
      </div>
      <div className="panel glass">
        <SectionTitle eyebrow="Today" title="Priority list" text="Your first unfinished tasks." />
        <div className="task-preview">
          {data.tasks.filter(x => !x.done).slice(0, 5).map(task => <div key={task.id}><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><strong>{task.title}</strong><small>{formatDate(task.due)}</small></div>)}
          {!data.tasks.some(x => !x.done) && <p className="empty">Everything is handled.</p>}
        </div>
      </div>
    </section>
  </div>;
}

function Stat({ label, value, note }) { return <div className="stat-card glass"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }

function Clients({ items, setItems }) {
  const blank = { name: '', phone: '', email: '', address: '', source: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState('');
  const add = e => { e.preventDefault(); if (!form.name.trim()) return; setItems([{ ...form, id: crypto.randomUUID(), created: new Date().toISOString() }, ...items]); setForm(blank); };
  const filtered = items.filter(x => `${x.name} ${x.email} ${x.phone}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><SectionTitle eyebrow="CRM" title="Clients" text="Keep every serious lead and client detail in one place." />
    <div className="two-column">
      <form className="panel glass form-grid" onSubmit={add}><h3>Add client</h3>
        <input placeholder="Client name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Property address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        <input placeholder="Lead source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
        <textarea placeholder="Notes, preferences, budget, concerns…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <button className="primary">Save client</button>
      </form>
      <div className="panel glass"><div className="list-toolbar"><h3>Client directory</h3><input placeholder="Search clients" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="cards-list">{filtered.map(item => <article key={item.id} className="record-card"><div><h4>{item.name}</h4><p>{item.address || 'No address saved'}</p><small>{item.phone} {item.email && `• ${item.email}`}</small></div><button className="danger" onClick={() => setItems(items.filter(x => x.id !== item.id))}>Delete</button></article>)}{!filtered.length && <p className="empty">No clients yet.</p>}</div>
      </div>
    </div>
  </div>;
}

function Projects({ items, setItems, clients }) {
  const blank = { title: '', client: '', address: '', status: 'Lead', budget: '', start: '', end: '', scope: '' };
  const [form, setForm] = useState(blank);
  const add = e => { e.preventDefault(); if (!form.title) return; setItems([{ ...form, id: crypto.randomUUID() }, ...items]); setForm(blank); };
  return <div className="page"><SectionTitle eyebrow="Operations" title="Projects" text="Track work from first inquiry through final installation." />
    <div className="two-column">
      <form className="panel glass form-grid" onSubmit={add}><h3>New project</h3>
        <input placeholder="Project title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <select value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}><option value="">Select client</option>{clients.map(c => <option key={c.id}>{c.name}</option>)}</select>
        <input placeholder="Property address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['Lead','Consultation','Designing','Approved','Scheduled','In Progress','Completed','On Hold'].map(x => <option key={x}>{x}</option>)}</select>
        <input type="number" placeholder="Estimated budget" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
        <label>Start date<input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label>
        <label>End date<input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
        <textarea placeholder="Scope, plant ideas, measurements, site conditions…" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} />
        <button className="primary">Create project</button>
      </form>
      <div className="panel glass"><h3>Project pipeline</h3><div className="cards-list">{items.map(p => <article key={p.id} className="project-card"><div className="project-top"><span className="status">{p.status}</span><strong>{money(p.budget)}</strong></div><h4>{p.title}</h4><p>{p.client || 'Unassigned client'} • {p.address || 'No address'}</p><small>{formatDate(p.start)} → {formatDate(p.end)}</small><textarea value={p.scope} onChange={e => setItems(items.map(x => x.id === p.id ? { ...x, scope: e.target.value } : x))} /><div className="row-actions"><select value={p.status} onChange={e => setItems(items.map(x => x.id === p.id ? { ...x, status: e.target.value } : x))}>{['Lead','Consultation','Designing','Approved','Scheduled','In Progress','Completed','On Hold'].map(x => <option key={x}>{x}</option>)}</select><button className="danger" onClick={() => setItems(items.filter(x => x.id !== p.id))}>Delete</button></div></article>)}{!items.length && <p className="empty">No projects yet.</p>}</div></div>
    </div>
  </div>;
}

function SketchStudio({ projects }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [baseImage, setBaseImage] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [size, setSize] = useState(6);
  const [color, setColor] = useState('#c8495c');
  const [project, setProject] = useState('');

  const setupCanvas = (img) => {
    const canvas = canvasRef.current;
    const maxW = Math.min(1200, window.innerWidth - 40);
    const ratio = img.height / img.width;
    canvas.width = maxW;
    canvas.height = Math.round(maxW * ratio);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const upload = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { imageRef.current = img; setBaseImage(reader.result); setupCanvas(img); }; img.src = reader.result; };
    reader.readAsDataURL(file);
  };

  const point = e => {
    const canvas = canvasRef.current; const r = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    return { x: ((touch?.clientX ?? e.clientX) - r.left) * canvas.width / r.width, y: ((touch?.clientY ?? e.clientY) - r.top) * canvas.height / r.height };
  };
  const start = e => { if (!baseImage) return; e.preventDefault(); setDrawing(true); const p = point(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = e => { if (!drawing) return; e.preventDefault(); const p = point(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = size; ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color; ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => setDrawing(false);
  const reset = () => imageRef.current && setupCanvas(imageRef.current);
  const download = () => { const link = document.createElement('a'); link.download = `${project || 'tierra-fleur-property-sketch'}.png`; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };

  return <div className="page"><SectionTitle eyebrow="Design studio" title="Property Sketch" text="Upload a client property photo, then draw directly over it with your finger, Apple Pencil, or mouse." />
    <div className="panel glass sketch-toolbar">
      <select value={project} onChange={e => setProject(e.target.value)}><option value="">Choose project label</option>{projects.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}</select>
      <label className="upload-button">Upload property photo<input type="file" accept="image/*" onChange={upload} /></label>
      <button className={tool === 'pen' ? 'active-tool' : ''} onClick={() => setTool('pen')}>Pen</button>
      <button className={tool === 'eraser' ? 'active-tool' : ''} onClick={() => setTool('eraser')}>Eraser</button>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} title="Line color" />
      <label>Brush <input type="range" min="2" max="30" value={size} onChange={e => setSize(Number(e.target.value))} /></label>
      <button onClick={reset}>Reset</button><button className="primary" onClick={download} disabled={!baseImage}>Save sketch PNG</button>
    </div>
    <div className="sketch-stage glass">
      {!baseImage && <div className="sketch-placeholder"><strong>Upload a property photo to begin</strong><span>Your photo stays on this device unless you export it.</span></div>}
      <canvas ref={canvasRef} className={baseImage ? '' : 'hidden'} onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
    </div>
  </div>;
}

function Expenses({ items, setItems }) {
  const blank = { date: new Date().toISOString().slice(0,10), vendor: '', category: 'Plants & Materials', amount: '', project: '', notes: '', receipt: '' };
  const [form, setForm] = useState(blank);
  const addReceipt = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm({ ...form, receipt: r.result, receiptName: f.name }); r.readAsDataURL(f); };
  const add = e => { e.preventDefault(); if (!form.vendor || !form.amount) return; setItems([{ ...form, id: crypto.randomUUID() }, ...items]); setForm(blank); };
  const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);
  return <div className="page"><SectionTitle eyebrow="Bookkeeping" title="Expenses & Receipts" text="Record business spending and keep a photo or PDF receipt with each entry." action={<div className="total-chip">Total {money(total)}</div>} />
    <div className="two-column">
      <form className="panel glass form-grid" onSubmit={add}><h3>Record expense</h3>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <input placeholder="Vendor *" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['Plants & Materials','Tools & Equipment','Fuel & Travel','Marketing','Office','Insurance & Fees','Subcontractor','Other'].map(x => <option key={x}>{x}</option>)}</select>
        <input type="number" step="0.01" placeholder="Amount *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <input placeholder="Project or client" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} />
        <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <label className="upload-button">Attach receipt<input type="file" accept="image/*,.pdf" onChange={addReceipt} /></label>{form.receiptName && <small>{form.receiptName}</small>}
        <button className="primary">Save expense</button>
      </form>
      <div className="panel glass"><h3>Expense ledger</h3><div className="cards-list">{items.map(x => <article key={x.id} className="record-card"><div><h4>{x.vendor} — {money(x.amount)}</h4><p>{x.category} • {formatDate(x.date)}</p><small>{x.project || x.notes || 'No project note'}</small>{x.receipt && <a href={x.receipt} target="_blank" rel="noreferrer">Open receipt</a>}</div><button className="danger" onClick={() => setItems(items.filter(i => i.id !== x.id))}>Delete</button></article>)}{!items.length && <p className="empty">No expenses recorded.</p>}</div></div>
    </div>
  </div>;
}

function Estimates({ items, setItems, clients, services, business }) {
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('Landscape Design Proposal');
  const [status, setStatus] = useState('Draft');
  const [lines, setLines] = useState([{ id: crypto.randomUUID(), description: '', qty: 1, price: 0 }]);
  const subtotal = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.price || 0), 0);
  const tax = subtotal * Number(business.defaultTax || 0) / 100;
  const total = subtotal + tax;
  const add = () => { if (!client || !lines.some(l => l.description)) return; setItems([{ id: crypto.randomUUID(), client, title, status, lines, subtotal, tax, total, date: new Date().toISOString().slice(0,10) }, ...items]); };
  const print = estimate => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${estimate.title}</title><style>body{font-family:Georgia,serif;padding:48px;color:#263127}h1{color:#52684f}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:20px;margin-top:24px}</style></head><body><h1>${business.name}</h1><p>${business.tagline}</p><hr><h2>${estimate.title}</h2><p><strong>Client:</strong> ${estimate.client}<br><strong>Date:</strong> ${formatDate(estimate.date)}<br><strong>Status:</strong> ${estimate.status}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${estimate.lines.map(l => `<tr><td>${l.description}</td><td>${l.qty}</td><td>${money(l.price)}</td><td>${money(l.qty*l.price)}</td></tr>`).join('')}</tbody></table><div class='total'><p>Subtotal: ${money(estimate.subtotal)}</p><p>Tax: ${money(estimate.tax)}</p><h3>Total: ${money(estimate.total)}</h3></div><script>window.print()</script></body></html>`);
    win.document.close();
  };
  return <div className="page"><SectionTitle eyebrow="Sales" title="Estimates & Invoices" text="Build quotes, mark payment status, and print polished client documents." />
    <div className="two-column">
      <div className="panel glass form-grid"><h3>Create document</h3>
        <select value={client} onChange={e => setClient(e.target.value)}><option value="">Select client *</option>{clients.map(c => <option key={c.id}>{c.name}</option>)}</select>
        <input value={title} onChange={e => setTitle(e.target.value)} />
        <select value={status} onChange={e => setStatus(e.target.value)}>{['Draft','Sent','Approved','Deposit Paid','Paid','Cancelled'].map(x => <option key={x}>{x}</option>)}</select>
        <div className="line-items">{lines.map(line => <div key={line.id} className="line-row"><input list="services" placeholder="Service or item" value={line.description} onChange={e => setLines(lines.map(x => x.id === line.id ? { ...x, description: e.target.value } : x))} /><input type="number" min="1" value={line.qty} onChange={e => setLines(lines.map(x => x.id === line.id ? { ...x, qty: e.target.value } : x))} /><input type="number" step="0.01" value={line.price} onChange={e => setLines(lines.map(x => x.id === line.id ? { ...x, price: e.target.value } : x))} /></div>)}<datalist id="services">{services.map(s => <option key={s.id} value={s.name} />)}</datalist></div>
        <button onClick={() => setLines([...lines, { id: crypto.randomUUID(), description: '', qty: 1, price: 0 }])}>Add line</button>
        <div className="estimate-total"><span>Subtotal {money(subtotal)}</span><span>Tax {money(tax)}</span><strong>Total {money(total)}</strong></div>
        <button className="primary" onClick={add}>Save document</button>
      </div>
      <div className="panel glass"><h3>Saved documents</h3><div className="cards-list">{items.map(x => <article key={x.id} className="record-card"><div><h4>{x.title}</h4><p>{x.client} • {x.status}</p><strong>{money(x.total)}</strong></div><div className="stack-actions"><button onClick={() => print(x)}>Print / PDF</button><select value={x.status} onChange={e => setItems(items.map(i => i.id === x.id ? { ...i, status: e.target.value } : i))}>{['Draft','Sent','Approved','Deposit Paid','Paid','Cancelled'].map(s => <option key={s}>{s}</option>)}</select><button className="danger" onClick={() => setItems(items.filter(i => i.id !== x.id))}>Delete</button></div></article>)}{!items.length && <p className="empty">No estimates or invoices yet.</p>}</div></div>
    </div>
  </div>;
}

function Tasks({ items, setItems }) {
  const [title, setTitle] = useState(''); const [due, setDue] = useState(''); const [priority, setPriority] = useState('Medium');
  const add = e => { e.preventDefault(); if (!title) return; setItems([{ id: crypto.randomUUID(), title, due, priority, done: false }, ...items]); setTitle(''); setDue(''); };
  return <div className="page"><SectionTitle eyebrow="Daily control" title="Tasks" text="Keep business follow-ups, shopping, design work, and deadlines visible." />
    <form className="panel glass inline-form" onSubmit={add}><input placeholder="New task" value={title} onChange={e => setTitle(e.target.value)} /><input type="date" value={due} onChange={e => setDue(e.target.value)} /><select value={priority} onChange={e => setPriority(e.target.value)}>{['High','Medium','Low'].map(x => <option key={x}>{x}</option>)}</select><button className="primary">Add task</button></form>
    <div className="panel glass task-list">{items.map(t => <label key={t.id} className={t.done ? 'done' : ''}><input type="checkbox" checked={t.done} onChange={() => setItems(items.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} /><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><strong>{t.title}</strong><small>{formatDate(t.due)}</small><button className="danger" onClick={e => { e.preventDefault(); setItems(items.filter(x => x.id !== t.id)); }}>Delete</button></label>)}</div>
  </div>;
}

function Services({ items, setItems }) {
  const [name, setName] = useState(''); const [price, setPrice] = useState(''); const [unit, setUnit] = useState('project');
  const add = e => { e.preventDefault(); if (!name) return; setItems([...items, { id: crypto.randomUUID(), name, price, unit }]); setName(''); setPrice(''); };
  return <div className="page"><SectionTitle eyebrow="Price book" title="Services & Pricing" text="Keep your standard offers ready for estimates and client conversations." />
    <form className="panel glass inline-form" onSubmit={add}><input placeholder="Service name" value={name} onChange={e => setName(e.target.value)} /><input type="number" step="0.01" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} /><input placeholder="Unit, e.g. visit" value={unit} onChange={e => setUnit(e.target.value)} /><button className="primary">Add service</button></form>
    <div className="service-grid">{items.map(s => <article className="panel glass" key={s.id}><span>Service</span><h3>{s.name}</h3><strong>{money(s.price)} / {s.unit}</strong><button className="danger" onClick={() => setItems(items.filter(x => x.id !== s.id))}>Delete</button></article>)}</div>
  </div>;
}

const blankNursery = {
  name: '',
  website: '',
  phone: '',
  email: '',
  location: '',
  specialties: '',
  products: '',
  wholesaleAvailability: '',
  shippingNotes: '',
  pricingNotes: '',
  qualityNotes: '',
  personalNotes: '',
  favorite: false,
};

function NurseryDirectory({ items, setItems }) {
  const [form, setForm] = useState(blankNursery);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter(item => !favoritesOnly || item.favorite)
      .filter(item => !query || Object.entries(item).some(([key, value]) => key !== 'id' && String(value || '').toLowerCase().includes(query)))
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name));
  }, [items, search, favoritesOnly]);

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const resetForm = () => { setForm(blankNursery); setEditingId(null); };
  const save = e => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      setItems(items.map(item => item.id === editingId ? { ...item, ...form, name: form.name.trim() } : item));
    } else {
      setItems([{ ...blankNursery, ...form, id: crypto.randomUUID(), name: form.name.trim() }, ...items]);
    }
    resetForm();
  };
  const edit = item => {
    setForm({ ...blankNursery, ...item });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = item => {
    if (confirm(`Delete ${item.name} from the Nursery Directory?`)) {
      setItems(items.filter(nursery => nursery.id !== item.id));
      if (editingId === item.id) resetForm();
    }
  };
  const toggleFavorite = item => setItems(items.map(nursery => nursery.id === item.id ? { ...nursery, favorite: !nursery.favorite } : nursery));
  const websiteUrl = value => value && (/^https?:\/\//i.test(value) ? value : `https://${value}`);
  const detail = value => value?.trim() || 'Complete later';

  return <div className="page">
    <SectionTitle eyebrow="Sourcing library" title="Nursery Directory" text="Keep reputable nurseries and specialty growers organized, searchable, and ready when a project needs the perfect plant." action={<div className="total-chip">{items.length} saved</div>} />
    <div className="nursery-layout">
      <form className="panel glass nursery-form" onSubmit={save}>
        <div className="nursery-form-heading">
          <div><span className="form-eyebrow">{editingId ? 'Editing record' : 'New source'}</span><h3>{editingId ? form.name || 'Nursery record' : 'Add a nursery'}</h3></div>
          {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
        <p className="form-note">Only the nursery name is required. Leave unverified details blank to complete later.</p>
        <div className="nursery-fields">
          <label className="field-wide">Nursery name *<input required placeholder="Nursery or grower name" value={form.name} onChange={e => setField('name', e.target.value)} /></label>
          <label>Website<input inputMode="url" placeholder="Complete later" value={form.website} onChange={e => setField('website', e.target.value)} /></label>
          <label>Phone<input inputMode="tel" placeholder="Complete later" value={form.phone} onChange={e => setField('phone', e.target.value)} /></label>
          <label>Email<input type="email" inputMode="email" placeholder="Complete later" value={form.email} onChange={e => setField('email', e.target.value)} /></label>
          <label>Location<input placeholder="Complete later" value={form.location} onChange={e => setField('location', e.target.value)} /></label>
          <label className="field-wide">Specialties<textarea placeholder="Complete later" value={form.specialties} onChange={e => setField('specialties', e.target.value)} /></label>
          <label className="field-wide">Plants or products carried<textarea placeholder="Complete later" value={form.products} onChange={e => setField('products', e.target.value)} /></label>
          <label className="field-wide">Wholesale availability<select value={form.wholesaleAvailability} onChange={e => setField('wholesaleAvailability', e.target.value)}><option value="">Complete later</option><option>Available</option><option>Not available</option><option>Ask nursery</option></select></label>
          <label className="field-wide">Shipping notes<textarea placeholder="Complete later" value={form.shippingNotes} onChange={e => setField('shippingNotes', e.target.value)} /></label>
          <label>Pricing notes<textarea placeholder="Complete later" value={form.pricingNotes} onChange={e => setField('pricingNotes', e.target.value)} /></label>
          <label>Quality notes<textarea placeholder="Complete later" value={form.qualityNotes} onChange={e => setField('qualityNotes', e.target.value)} /></label>
          <label className="field-wide">Personal notes<textarea placeholder="Complete later" value={form.personalNotes} onChange={e => setField('personalNotes', e.target.value)} /></label>
          <label className="favorite-check field-wide"><input type="checkbox" checked={form.favorite} onChange={e => setField('favorite', e.target.checked)} /> Mark as a favorite source</label>
        </div>
        <button className="primary nursery-save">{editingId ? 'Save changes' : 'Add to directory'}</button>
      </form>

      <section className="panel glass nursery-directory-panel">
        <div className="nursery-toolbar">
          <div><span className="form-eyebrow">Source book</span><h3>Saved nurseries</h3></div>
          <label className="nursery-search"><span>Search directory</span><input type="search" placeholder="Name, plant, location, notes…" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <button type="button" className={favoritesOnly ? 'favorite-filter active' : 'favorite-filter'} onClick={() => setFavoritesOnly(value => !value)} aria-pressed={favoritesOnly}>★ Favorites</button>
        </div>
        <div className="nursery-results" aria-live="polite">
          {filtered.map(item => <article className={item.favorite ? 'nursery-card favorite' : 'nursery-card'} key={item.id}>
            <div className="nursery-card-top">
              <div><span className="nursery-kicker">{item.favorite ? 'Favorite source' : 'Nursery & grower'}</span><h3>{item.name}</h3><p>{detail(item.location)}</p></div>
              <button type="button" className="favorite-button" onClick={() => toggleFavorite(item)} aria-label={`${item.favorite ? 'Remove' : 'Add'} ${item.name} ${item.favorite ? 'from' : 'to'} favorites`} aria-pressed={Boolean(item.favorite)}>{item.favorite ? '★' : '☆'}</button>
            </div>
            <div className="nursery-contact-actions">
              <a className={!item.website ? 'contact-button disabled' : 'contact-button'} href={websiteUrl(item.website) || '#'} target={item.website ? '_blank' : undefined} rel={item.website ? 'noreferrer' : undefined} onClick={e => !item.website && e.preventDefault()} aria-disabled={!item.website}>Visit Website</a>
              <a className={!item.phone ? 'contact-button disabled' : 'contact-button'} href={item.phone ? `tel:${item.phone}` : '#'} onClick={e => !item.phone && e.preventDefault()} aria-disabled={!item.phone}>Call</a>
              <a className={!item.email ? 'contact-button disabled' : 'contact-button'} href={item.email ? `mailto:${item.email}` : '#'} onClick={e => !item.email && e.preventDefault()} aria-disabled={!item.email}>Email</a>
            </div>
            <div className="nursery-details">
              <div><span>Specialties</span><p>{detail(item.specialties)}</p></div>
              <div><span>Plants & products</span><p>{detail(item.products)}</p></div>
              <div><span>Wholesale</span><p>{detail(item.wholesaleAvailability)}</p></div>
              <div><span>Website</span><p>{detail(item.website)}</p></div>
              <div><span>Phone</span><p>{detail(item.phone)}</p></div>
              <div><span>Email</span><p>{detail(item.email)}</p></div>
              <div><span>Shipping notes</span><p>{detail(item.shippingNotes)}</p></div>
              <div><span>Pricing notes</span><p>{detail(item.pricingNotes)}</p></div>
              <div><span>Quality notes</span><p>{detail(item.qualityNotes)}</p></div>
              <div className="nursery-note"><span>Personal notes</span><p>{detail(item.personalNotes)}</p></div>
            </div>
            <div className="nursery-card-actions"><button type="button" onClick={() => edit(item)}>Edit nursery</button><button type="button" className="danger" onClick={() => remove(item)}>Delete</button></div>
          </article>)}
          {!filtered.length && <div className="nursery-empty"><strong>No nurseries match this view.</strong><p>Try a different search or show all saved sources.</p></div>}
        </div>
      </section>
    </div>
  </div>;
}


const createBlankPlantSource = () => ({ ...nurseryDefaults, categories: [] });

function PlantSourcingDirectory({ items, setItems }) {
  const [form, setForm] = useState(createBlankPlantSource);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const normalizedItems = useMemo(() => items.map(normalizeNursery), [items]);
  const activeItems = normalizedItems.filter(item => !item.archived);
  const localCount = activeItems.filter(item => item.location.toLowerCase().includes('delaware')).length;
  const approvedCount = activeItems.filter(item => item.approved).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return normalizedItems
      .filter(item => showArchived ? item.archived : !item.archived)
      .filter(item => category === 'All' || item.categories.includes(category))
      .filter(item => !favoritesOnly || item.favorite)
      .filter(item => !approvedOnly || item.approved)
      .filter(item => {
        if (!query) return true;
        const searchable = [
          item.name,
          item.location,
          item.phone,
          item.email,
          item.sourceType,
          item.specialties,
          item.plants,
          item.notes,
          item.shipsToDelaware,
          item.wholesaleAvailability,
          ...item.categories,
        ].join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) =>
        Number(Boolean(b.approved)) - Number(Boolean(a.approved))
        || Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
        || a.name.localeCompare(b.name)
      );
  }, [normalizedItems, search, category, favoritesOnly, approvedOnly, showArchived]);

  const groups = useMemo(() => {
    if (category !== 'All') return [{ category, nurseries: filtered }];
    return PLANT_CATEGORIES
      .map(groupCategory => ({
        category: groupCategory,
        nurseries: filtered.filter(item => item.categories[0] === groupCategory),
      }))
      .filter(group => group.nurseries.length);
  }, [filtered, category]);

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const resetForm = () => {
    setForm(createBlankPlantSource());
    setEditingId(null);
    setFormError('');
    setFormOpen(false);
  };
  const beginAdd = () => {
    setForm(createBlankPlantSource());
    setEditingId(null);
    setFormError('');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const edit = item => {
    setForm({ ...createBlankPlantSource(), ...normalizeNursery(item), categories: [...normalizeNursery(item).categories] });
    setEditingId(item.id);
    setFormError('');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleCategory = selectedCategory => {
    const categories = form.categories.includes(selectedCategory)
      ? form.categories.filter(item => item !== selectedCategory)
      : [...form.categories, selectedCategory];
    setField('categories', categories);
    if (categories.length) setFormError('');
  };
  const save = event => {
    event.preventDefault();
    if (!form.name.trim() || !form.categories.length) {
      setFormError('Add a nursery name and choose at least one plant specialty.');
      return;
    }
    const record = normalizeNursery({ ...form, name: form.name.trim() });
    if (editingId) {
      setItems(items.map(item => item.id === editingId ? { ...record, id: editingId } : item));
    } else {
      setItems([{ ...record, id: crypto.randomUUID() }, ...items]);
    }
    resetForm();
  };
  const patchItem = (id, patch) => setItems(items.map(item => item.id === id ? { ...item, ...patch } : item));
  const archive = item => {
    patchItem(item.id, { archived: !item.archived });
    if (editingId === item.id) resetForm();
  };
  const remove = item => {
    if (confirm(`Permanently delete ${item.name} from Plant Sourcing?`)) {
      setItems(items.filter(nursery => nursery.id !== item.id));
      if (editingId === item.id) resetForm();
    }
  };
  const websiteUrl = value => {
    if (!value) return '';
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const parsed = new URL(candidate);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  };

  return <div className="page plant-sourcing-page">
    <SectionTitle
      eyebrow="Curated grower library"
      title="Plant Sourcing Directory"
      text="Find trusted Delaware garden centers and reputable specialty growers by nursery, plant, or category."
      action={<button type="button" className="primary source-add-button" onClick={beginAdd}>+ Add nursery</button>}
    />

    <section className="source-overview glass">
      <span className="source-butterfly" aria-hidden="true">&#129419;</span>
      <div className="source-search-row">
        <label className="source-search">
          <span>Search the directory</span>
          <input type="search" placeholder="Search nursery, plant, or category…" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <div className="source-stats" aria-label="Plant sourcing summary">
          <div><strong>{activeItems.length}</strong><span>Active sources</span></div>
          <div><strong>{localCount}</strong><span>Delaware sources</span></div>
          <div><strong>{approvedCount}</strong><span>TF approved</span></div>
        </div>
      </div>
      <div className="category-filter" aria-label="Filter by plant specialty">
        {['All', ...PLANT_CATEGORIES].map(item => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} aria-pressed={category === item}>{item === 'All' ? 'All specialties' : categoryTitle(item)}</button>)}
      </div>
      <div className="source-view-filters">
        <button type="button" className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(value => !value)} aria-pressed={favoritesOnly}>★ Favorites</button>
        <button type="button" className={approvedOnly ? 'active approved' : ''} onClick={() => setApprovedOnly(value => !value)} aria-pressed={approvedOnly}>Tierra Fleur Approved</button>
        <button type="button" className={showArchived ? 'active archive' : ''} onClick={() => setShowArchived(value => !value)} aria-pressed={showArchived}>{showArchived ? 'Viewing archived' : 'View archived'}</button>
        <span>{filtered.length} {filtered.length === 1 ? 'nursery' : 'nurseries'}</span>
      </div>
    </section>

    {formOpen && <form className="source-form panel glass" onSubmit={save}>
      <div className="source-form-header">
        <div><span className="form-eyebrow">{editingId ? 'Editing source' : 'New plant source'}</span><h3>{editingId ? form.name || 'Nursery record' : 'Add a nursery'}</h3></div>
        <button type="button" onClick={resetForm}>Close</button>
      </div>
      <div className="source-form-grid">
        <label>Nursery name *<input required value={form.name} onChange={event => setField('name', event.target.value)} placeholder="Nursery or grower name" /></label>
        <label>Website<input inputMode="url" value={form.website} onChange={event => setField('website', event.target.value)} placeholder="https://…" /></label>
        <label>Location<input value={form.location} onChange={event => setField('location', event.target.value)} placeholder="City, state or service area" /></label>
        <label>Phone<input inputMode="tel" value={form.phone} onChange={event => setField('phone', event.target.value)} placeholder="Nursery phone" /></label>
        <label>Email<input type="email" inputMode="email" value={form.email} onChange={event => setField('email', event.target.value)} placeholder="Nursery email" /></label>
        <label>Source type<select value={form.sourceType} onChange={event => setField('sourceType', event.target.value)}>{['Local', 'Online', 'Both'].map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Ships to Delaware<select value={form.shipsToDelaware} onChange={event => setField('shipsToDelaware', event.target.value)}>{['Yes', 'No', 'Local pickup', 'Ask nursery'].map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Wholesale availability<select value={form.wholesaleAvailability} onChange={event => setField('wholesaleAvailability', event.target.value)}>{['Available', 'Not available', 'Ask nursery'].map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field-wide">Specialties<textarea value={form.specialties} onChange={event => setField('specialties', event.target.value)} placeholder="What this nursery does especially well" /></label>
        <label className="field-wide">Plants carried<textarea value={form.plants} onChange={event => setField('plants', event.target.value)} placeholder="Specific plants, varieties, supplies, or product lines" /></label>
        <fieldset className="source-category-picker field-wide">
          <legend>Plant specialties *</legend>
          <div>{PLANT_CATEGORIES.map(item => <label key={item} className={form.categories.includes(item) ? 'selected' : ''}><input type="checkbox" checked={form.categories.includes(item)} onChange={() => toggleCategory(item)} />{categoryTitle(item)}</label>)}</div>
        </fieldset>
        <label className="field-wide">Notes<textarea value={form.notes} onChange={event => setField('notes', event.target.value)} placeholder="Ordering windows, quality notes, minimums, contacts, or project experience" /></label>
        <div className="source-toggle-row field-wide">
          <label><input type="checkbox" checked={form.favorite} onChange={event => setField('favorite', event.target.checked)} /> Favorite source</label>
          <label className="approved-toggle"><input type="checkbox" checked={form.approved} onChange={event => setField('approved', event.target.checked)} /> Tierra Fleur Approved</label>
        </div>
      </div>
      {formError && <p className="source-form-error" role="alert">{formError}</p>}
      <div className="source-form-actions"><button type="button" onClick={resetForm}>Cancel</button><button className="primary">{editingId ? 'Save nursery changes' : 'Add to Plant Sourcing'}</button></div>
    </form>}

    <div className="source-groups" aria-live="polite">
      {groups.map(group => <section className="source-group" key={group.category}>
        <div className="source-group-heading">
          <span className="source-flourish" aria-hidden="true">❀</span>
          <div><span>Plant specialty</span><h3>{categoryTitle(group.category)}</h3></div>
          <small>{group.nurseries.length} {group.nurseries.length === 1 ? 'source' : 'sources'}</small>
        </div>
        <div className="source-card-grid">
          {group.nurseries.map(item => <article className={`source-card glass${item.favorite ? ' favorite' : ''}${item.approved ? ' approved' : ''}${item.archived ? ' archived' : ''}`} key={item.id}>
            <div className="source-card-top">
              <div>
                <div className="source-card-kicker"><span>{item.sourceType}</span>{item.archived && <span className="archived-badge">Archived</span>}</div>
                <h4>{item.name}</h4>
                <p>{item.location || 'Location to be confirmed'}</p>
              </div>
              <button type="button" className="source-favorite" onClick={() => patchItem(item.id, { favorite: !item.favorite })} aria-label={`${item.favorite ? 'Remove' : 'Add'} ${item.name} ${item.favorite ? 'from' : 'to'} favorites`} aria-pressed={item.favorite}>{item.favorite ? '★' : '☆'}</button>
            </div>
            <div className="source-category-tags">{item.categories.map(itemCategory => <span key={itemCategory}>{categoryTitle(itemCategory)}</span>)}</div>
            <div className="source-description">
              <div><span>Specialties</span><p>{item.specialties || 'Add specialty notes'}</p></div>
              <div><span>Plants & products</span><p>{item.plants || 'Add plants and products'}</p></div>
            </div>
            <dl className="source-facts">
              <div><dt>Ships to Delaware</dt><dd>{item.shipsToDelaware}</dd></div>
              <div><dt>Wholesale</dt><dd>{item.wholesaleAvailability}</dd></div>
            </dl>
            {item.notes && <p className="source-notes">{item.notes}</p>}
            <button type="button" className={item.approved ? 'source-approved active' : 'source-approved'} onClick={() => patchItem(item.id, { approved: !item.approved })} aria-pressed={item.approved}><span aria-hidden="true">✦</span>{item.approved ? 'Tierra Fleur Approved' : 'Mark Tierra Fleur Approved'}</button>
            <div className="source-card-actions">
              {websiteUrl(item.website) ? <a href={websiteUrl(item.website)} target="_blank" rel="noreferrer">Visit website</a> : <span className="source-link-disabled">Website needed</span>}
              {item.phone && <a className="source-contact-secondary" href={`tel:${item.phone}`}>Call</a>}
              {item.email && <a className="source-contact-secondary" href={`mailto:${item.email}`}>Email</a>}
              <button type="button" onClick={() => edit(item)}>Edit</button>
              <button type="button" onClick={() => archive(item)}>{item.archived ? 'Restore' : 'Archive'}</button>
              <button type="button" className="danger" onClick={() => remove(item)}>Delete</button>
            </div>
          </article>)}
        </div>
      </section>)}
      {!filtered.length && <section className="source-empty glass"><span aria-hidden="true">&#129419;</span><h3>No nurseries match this view.</h3><p>Try another plant specialty, clear a filter, or add a new source.</p></section>}
    </div>
  </div>;
}


function LearningCenter({ learning, setLearning }) {
  const [topic, setTopic] = useState('Pricing & Profit');
  const [level, setLevel] = useState(learning.preferences?.level || 'Growing');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');

  const recentTitles = (learning.history || []).slice(0, 12).map(x => x.title);

  const getLesson = async () => {
    setLoading(true); setError(''); setAnswer(''); setFeedback('');
    try {
      const res = await fetch('/.netlify/functions/live-learning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, recentTitles, business: 'Tierra Fleur Designs', location: 'Delaware, USA' })
      });
      if (!res.ok) throw new Error('Live lesson service is unavailable.');
      const next = await res.json();
      if (!next?.title || !next?.lesson) throw new Error('The lesson response was incomplete.');
      const record = { ...next, id: crypto.randomUUID(), topic, level, createdAt: new Date().toISOString() };
      setLesson(record);
      setLearning({ ...learning, preferences: { ...(learning.preferences || {}), level }, history: [record, ...(learning.history || [])].slice(0, 50) });
    } catch (err) {
      setError(err.message || 'Could not load a fresh lesson.');
    } finally { setLoading(false); }
  };

  const checkAnswer = () => {
    if (!lesson?.challenge) return;
    const normalized = answer.trim().toLowerCase();
    const accepted = (lesson.challenge.acceptedAnswers || []).some(x => normalized.includes(String(x).toLowerCase()));
    setFeedback(accepted ? 'Correct — you understood the business decision behind the lesson.' : lesson.challenge.explanation || 'Review the lesson and try again.');
  };

  const completeLesson = () => {
    if (!lesson) return;
    const completed = Array.from(new Set([lesson.id, ...(learning.completed || [])]));
    setLearning({ ...learning, completed });
    setFeedback('Lesson completed and added to your progress.');
  };

  return <div className="page">
    <SectionTitle eyebrow="Fresh, adaptive education" title="Live Learning Center" text="Each lesson is created from current information, your chosen focus, and your recent lesson history so the app does not recycle the same material with different wording." />
    <section className="learning-intro glass">
      <div>
        <span className="eyebrow">Tierra Fleur Academy</span>
        <h3>Learn what helps the business now.</h3>
        <p>The live engine searches for current information, then creates one focused lesson, a real-world Tierra Fleur example, and a knowledge check. Your recent lesson titles are excluded from the next request.</p>
      </div>
      <div className="learning-stats">
        <div><strong>{learning.history?.length || 0}</strong><span>Lessons generated</span></div>
        <div><strong>{learning.completed?.length || 0}</strong><span>Completed</span></div>
      </div>
    </section>

    <section className="panel glass learning-controls">
      <label>What do you want to learn today?
        <select value={topic} onChange={e => setTopic(e.target.value)}>
          {['Pricing & Profit','Client Consultations','Luxury Container Gardens','Edible Landscape Design','Contracts & Policies','Marketing & Lead Quality','Plant Selection & Sourcing','Project Management','Bookkeeping & Taxes','Therapeutic Garden Design'].map(x => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label>Depth
        <select value={level} onChange={e => setLevel(e.target.value)}>
          {['Foundation','Growing','Advanced'].map(x => <option key={x}>{x}</option>)}
        </select>
      </label>
      <button className="primary" onClick={getLesson} disabled={loading}>{loading ? 'Building a fresh lesson…' : 'Generate new live lesson'}</button>
    </section>

    {error && <div className="viz-error panel glass"><strong>Live lesson could not load.</strong><p>{error}</p><small>On Netlify, add OPENAI_API_KEY in Site configuration → Environment variables.</small></div>}

    {lesson && <article className="lesson-card glass">
      <div className="lesson-meta"><span>{lesson.topic}</span><span>{lesson.level}</span><span>{lesson.freshness || 'Current lesson'}</span></div>
      <h2>{lesson.title}</h2>
      <p className="lesson-summary">{lesson.summary}</p>
      <div className="lesson-body">{lesson.lesson.split('\n').filter(Boolean).map((p,i) => <p key={i}>{p}</p>)}</div>
      {lesson.tierraFleurExample && <div className="example-box"><strong>Tierra Fleur example</strong><p>{lesson.tierraFleurExample}</p></div>}
      {lesson.actionSteps?.length > 0 && <div><h3>Put it into practice</h3><ol>{lesson.actionSteps.map((x,i) => <li key={i}>{x}</li>)}</ol></div>}
      {lesson.challenge && <div className="challenge-box"><h3>Knowledge check</h3><p>{lesson.challenge.question}</p><input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer" /><div className="lesson-actions"><button onClick={checkAnswer}>Check answer</button><button className="primary" onClick={completeLesson}>Mark complete</button></div>{feedback && <p className="feedback" aria-live="polite">{feedback}</p>}</div>}
      {lesson.sources?.length > 0 && <div className="lesson-sources"><strong>Current sources used</strong>{lesson.sources.map((s,i) => <a key={i} href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>)}</div>}
    </article>}

    {!lesson && <section className="learning-empty glass"><h3>No recycled lesson carousel.</h3><p>Choose a topic and the app will build a new lesson when you ask for one. It remembers recent lessons so it can move forward instead of circling the same information.</p></section>}

    {(learning.history || []).length > 0 && <section className="panel glass"><h3>Recent learning history</h3><div className="history-list">{learning.history.slice(0,8).map(item => <button key={item.id} onClick={() => setLesson(item)}><strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleDateString()} • {item.topic}</span></button>)}</div></section>}
  </div>;
}

function Settings({ data, setData }) {
  const b = data.business;
  const setB = patch => setData(prev => ({ ...prev, business: { ...prev.business, ...patch } }));
  const exportData = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tierra-fleur-backup.json'; a.click(); URL.revokeObjectURL(a.href); };
  const importData = e => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { setData(normalizeData(JSON.parse(r.result))); } catch { alert('That backup file could not be read.'); } }; r.readAsText(file); };
  return <div className="page"><SectionTitle eyebrow="Administration" title="Business Settings" text="Personalize documents and keep a portable backup of your business records." />
    <div className="two-column"><div className="panel glass form-grid"><h3>Business profile</h3><input value={b.name} onChange={e => setB({ name: e.target.value })} /><input value={b.tagline} onChange={e => setB({ tagline: e.target.value })} /><input placeholder="Business email" value={b.email} onChange={e => setB({ email: e.target.value })} /><input placeholder="Business phone" value={b.phone} onChange={e => setB({ phone: e.target.value })} /><input placeholder="Mailing address" value={b.address} onChange={e => setB({ address: e.target.value })} /><label>Default tax rate %<input type="number" step="0.01" value={b.defaultTax} onChange={e => setB({ defaultTax: e.target.value })} /></label></div>
      <div className="panel glass form-grid"><h3>Data backup</h3><p>Export regularly, especially before major code updates or moving the app to a new device.</p><button className="primary" onClick={exportData}>Export business backup</button><label className="upload-button">Import backup<input type="file" accept="application/json" onChange={importData} /></label><button className="danger" onClick={() => { if (confirm('Erase all Tierra Fleur app data on this device?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }}>Erase local data</button></div>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
