import { NewsArticle } from '../types';

export const SAMPLE_ARTICLES: NewsArticle[] = [
  {
    id: 'sample-1',
    title: 'Solid-State Battery Breakthrough Unlocks 600-Mile EV Range with 10-Minute Fast Charging',
    source: 'CleanTech Daily',
    category: 'Technology',
    url: 'https://example.com/battery-breakthrough',
    content: `Engineers at an international energy lab have announced a commercial-grade solid-state battery capable of retaining 95% capacity after 1,200 fast-charge cycles. By replacing liquid electrolytes with an ultra-thin ceramic composite, the new cells resist dendrite formation and thermal runaway, offering double the volumetric density of current lithium-ion batteries.

Automotive partners plan pilot manufacturing line tests later this year, projecting that long-distance electric vehicles could achieve over 600 miles on a single charge and recharge from 10% to 80% in just under ten minutes under standard motorway chargers. Analysts suggest this could remove the primary barrier for mass fleet electrification and heavy-duty logistics.`
  },
  {
    id: 'sample-2',
    title: 'Central Banks Signal Coordinated Shift Toward Digital Settlement Frameworks',
    source: 'Financial Dispatch',
    category: 'Economy',
    url: 'https://example.com/central-bank-digital-settlements',
    content: `A consortium of major central banks and wholesale clearing houses published joint regulatory guidance on real-time cross-border settlements. The framework outlines standard protocols for tokenised bank deposits and sovereign liquidity pools, targeting an 80% reduction in foreign exchange settlement lag.

While retail central bank digital currencies remain debated, wholesale cross-border operations have gained swift momentum. Commercial lenders participating in the pilot reported frictionless multilateral clearing across Tokyo, London, Zurich, and New York, bypassing multi-day correspondent banking corridors and significantly slashing transaction frictional costs.`
  },
  {
    id: 'sample-3',
    title: 'Next-Gen High-Speed Rail Corridor Opens First Phase, Slashing Intercity Travel Time in Half',
    source: 'Transit & Infrastructure Review',
    category: 'Transportation',
    url: 'https://example.com/high-speed-rail-corridor',
    content: `The inaugural 140-mile segment of the Regional High-Speed Rail Corridor officially carried its first commercial passengers this morning. Operating at sustained velocities of 220 miles per hour on magnetic-grade ballastless track, the automated electric trains reduced transit times between regional economic hubs from two hours by car down to thirty-eight minutes.

Transit planners highlighted integrated station design featuring solar canopies, micromobility hubs, and touchless biometric boarding. Initial ridership exceeded opening-day projections, with transportation officials forecasting a reduction of roughly 14,000 daily automotive commuter trips along the parallel motorway corridor.`
  },
  {
    id: 'sample-4',
    title: 'Orbital Observatory Detects Potentially Habitable Atmosphere in Nearby Stellar System',
    source: 'AstroPhysical Journal Weekly',
    category: 'Science',
    url: 'https://example.com/habitable-atmosphere-discovery',
    content: `Spectroscopic observations captured by the latest generation space telescope have revealed unambiguous signatures of water vapour, carbon dioxide, and ozone in the upper atmosphere of a rocky exoplanet orbiting a quiet red dwarf star thirty-four light-years away.

The planet, designated Kepler-712d, maintains an equilibrium temperature closely mirroring Earth and resides comfortably within the liquid water habitable zone. Researchers caution that atmospheric density and magnetic shielding require further deep-exposure spectrography before confirming surface liquid water, but astrobiologists call it the most compelling atmospheric profile discovered to date.`
  }
];
