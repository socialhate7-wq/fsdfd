export interface DetailedBasketballCard {
  id: string;
  name: string;
  number: string;
  position: string;
  team: string;
  teamShort: string;
  season: string;
  image: string;
  seasonAverages: {
    gp: number | string;
    min: string;
    pts: string;
    reb: string;
    ast: string;
    stl: string;
    blk: string;
  };
  shooting: {
    fg: string;
    threeP: string;
    ft: string;
  };
  advanced: {
    per: string;
    tsPct: string;
    usgPct: string;
    bpm: string;
  };
  cardStats: {
    ppg: string;
    rpg: string;
    apg: string;
    fgPct: string;
    threePct: string;
    ftPct: string;
  };
}

export const NBA_STAR_CARDS: DetailedBasketballCard[] = [
  {
    id: 'luka-doncic-77',
    name: 'LUKA DONČIĆ',
    number: '#77',
    position: 'PG',
    team: 'Dallas Mavericks',
    teamShort: 'DAL',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_1.png',
    seasonAverages: {
      gp: 70,
      min: '37.5',
      pts: '33.9',
      reb: '9.2',
      ast: '9.8',
      stl: '1.4',
      blk: '0.5',
    },
    shooting: {
      fg: '48.7%',
      threeP: '38.2%',
      ft: '78.6%',
    },
    advanced: {
      per: '28.1',
      tsPct: '61.7%',
      usgPct: '36.0%',
      bpm: '+9.9',
    },
    cardStats: {
      ppg: '33.9 PTS',
      rpg: '9.2 REB',
      apg: '9.8 AST',
      fgPct: '48.7% FG',
      threePct: '38.2% 3P',
      ftPct: '78.6% FT',
    },
  },
  {
    id: 'giannis-antetokounmpo-34',
    name: 'GIANNIS ANTETOKOUNMPO',
    number: '#34',
    position: 'PF',
    team: 'Milwaukee Bucks',
    teamShort: 'MIL',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_2.png',
    seasonAverages: {
      gp: 73,
      min: '35.2',
      pts: '30.4',
      reb: '11.5',
      ast: '6.5',
      stl: '1.2',
      blk: '1.1',
    },
    shooting: {
      fg: '61.1%',
      threeP: '27.4%',
      ft: '65.7%',
    },
    advanced: {
      per: '29.9',
      tsPct: '64.9%',
      usgPct: '34.9%',
      bpm: '+9.0',
    },
    cardStats: {
      ppg: '30.4 PTS',
      rpg: '11.5 REB',
      apg: '6.5 AST',
      fgPct: '61.1% FG',
      threePct: '27.4% 3P',
      ftPct: '65.7% FT',
    },
  },
  {
    id: 'nikola-jokic-15',
    name: 'NIKOLA JOKIĆ',
    number: '#15',
    position: 'C',
    team: 'Denver Nuggets',
    teamShort: 'DEN',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_3.png',
    seasonAverages: {
      gp: 79,
      min: '34.6',
      pts: '26.4',
      reb: '12.4',
      ast: '9.0',
      stl: '1.4',
      blk: '0.9',
    },
    shooting: {
      fg: '58.3%',
      threeP: '35.9%',
      ft: '81.7%',
    },
    advanced: {
      per: '31.0',
      tsPct: '65.0%',
      usgPct: '29.3%',
      bpm: '+13.2',
    },
    cardStats: {
      ppg: '26.4 PTS',
      rpg: '12.4 REB',
      apg: '9.0 AST',
      fgPct: '58.3% FG',
      threePct: '35.9% 3P',
      ftPct: '81.7% FT',
    },
  },
  {
    id: 'shai-gilgeous-alexander-2',
    name: 'SHAI GILGEOUS-ALEXANDER',
    number: '#2',
    position: 'SG',
    team: 'Oklahoma City Thunder',
    teamShort: 'OKC',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_4.png',
    seasonAverages: {
      gp: 75,
      min: '34.4',
      pts: '30.1',
      reb: '5.5',
      ast: '6.2',
      stl: '2.0',
      blk: '0.9',
    },
    shooting: {
      fg: '53.5%',
      threeP: '35.3%',
      ft: '87.4%',
    },
    advanced: {
      per: '29.3',
      tsPct: '63.6%',
      usgPct: '32.6%',
      bpm: '+9.8',
    },
    cardStats: {
      ppg: '30.1 PTS',
      rpg: '5.5 REB',
      apg: '6.2 AST',
      fgPct: '53.5% FG',
      threePct: '35.3% 3P',
      ftPct: '87.4% FT',
    },
  },
  {
    id: 'stephen-curry-30',
    name: 'STEPHEN CURRY',
    number: '#30',
    position: 'PG',
    team: 'Golden State Warriors',
    teamShort: 'GSW',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_1.png',
    seasonAverages: {
      gp: 74,
      min: '32.7',
      pts: '26.4',
      reb: '4.5',
      ast: '5.1',
      stl: '0.7',
      blk: '0.4',
    },
    shooting: {
      fg: '45.0%',
      threeP: '40.8%',
      ft: '92.3%',
    },
    advanced: {
      per: '20.6',
      tsPct: '61.6%',
      usgPct: '30.1%',
      bpm: '+4.8',
    },
    cardStats: {
      ppg: '26.4 PTS',
      rpg: '4.5 REB',
      apg: '5.1 AST',
      fgPct: '45.0% FG',
      threePct: '40.8% 3P',
      ftPct: '92.3% FT',
    },
  },
  {
    id: 'victor-wembanyama-1',
    name: 'VICTOR WEMBANYAMA',
    number: '#1',
    position: 'C',
    team: 'San Antonio Spurs',
    teamShort: 'SAS',
    season: '2023-24 REGULAR SEASON',
    image: '/jugador_2.png',
    seasonAverages: {
      gp: 71,
      min: '29.7',
      pts: '21.4',
      reb: '10.6',
      ast: '3.9',
      stl: '1.2',
      blk: '3.6',
    },
    shooting: {
      fg: '46.5%',
      threeP: '32.5%',
      ft: '79.6%',
    },
    advanced: {
      per: '23.1',
      tsPct: '56.5%',
      usgPct: '32.2%',
      bpm: '+5.2',
    },
    cardStats: {
      ppg: '21.4 PTS',
      rpg: '10.6 REB',
      apg: '3.9 AST',
      fgPct: '46.5% FG',
      threePct: '32.5% 3P',
      ftPct: '79.6% FT',
    },
  },
];
