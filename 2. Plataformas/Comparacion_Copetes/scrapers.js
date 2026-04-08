/**
 * ComparaCopete Chile - Scrapers
 *
 * Estrategia por tienda:
 *  - Unimarc / Jumbo  → API VTEX (JSON directo, rápido, sin Puppeteer)
 *  - Lider            → API interna JSON
 *  - La Barra / Descorcha / Liquidos / Operals / El Brindis → Puppeteer
 *
 * Los precios se indexan por { productId -> { storeId -> { price, url, name } } }
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const defaults = require('./config/defaults');
const log = require('./logger');

const DELAY = ms => new Promise(r => setTimeout(r, ms));
function randomUA() { return defaults.USER_AGENTS[Math.floor(Math.random() * defaults.USER_AGENTS.length)]; }

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS A SCRAPEAR
// Cada producto tiene un término de búsqueda optimizado por tienda
// ═══════════════════════════════════════════════════════════════
const PRODUCTS = [
  // CERVEZAS
  { id: 'e1',   term: 'Escudo lata 350'           },
  { id: 'e2',   term: 'Escudo pack 6'              },
  { id: 'e3',   term: 'Cristal lata 350'           },
  { id: 'e4',   term: 'Heineken lata 330'          },
  { id: 'e5',   term: 'Corona botella 355'         },
  { id: 'e6',   term: 'Budweiser lata 355'         },
  { id: 'e7',   term: 'Stella Artois lata 330'     },
  { id: 'e8',   term: 'Kunstmann Torobayo'         },
  { id: 'e9',   term: 'Kross Golden Ale'           },
  { id: 'e10',  term: 'Austral Calafate'           },
  { id: 'e11',  term: 'Patagonia Amber Lager'      },
  { id: 'e12',  term: 'Sol lata 355'               },
  { id: 'e13',  term: 'Schneider lata 500'         },
  // SIN ALCOHOL
  { id: 'sa1',  term: 'Heineken 0.0'               },
  { id: 'sa2',  term: 'Budweiser Zero'             },
  { id: 'sa3',  term: 'Corona Cero'                },
  { id: 'sa4',  term: 'Stella Artois sin alcohol'  },
  { id: 'sa5',  term: 'Kunstmann sin alcohol'      },
  // PISCO
  { id: 'p1',   term: 'Capel 35 750ml'             },
  { id: 'p2',   term: 'Capel 40 750ml'             },
  { id: 'p3',   term: 'Capel doble destilado'      },
  { id: 'p4',   term: 'Control C 35 750ml'         },
  { id: 'p5',   term: 'Alto del Carmen 35'         },
  { id: 'p6',   term: 'Mistral Gran Mistral'       },
  { id: 'p7',   term: 'ABA pisco 35'               },
  // GIN
  { id: 'g1',   term: "Gordon's gin 750"           },
  { id: 'g2',   term: 'Beefeater gin 750'          },
  { id: 'g3',   term: 'Bombay Sapphire 750'        },
  { id: 'g4',   term: 'Tanqueray 750'              },
  { id: 'g5',   term: "Hendrick's gin"             },
  { id: 'g6',   term: 'Monkey 47 gin'              },
  // WHISKY
  { id: 'w1',   term: 'Johnnie Walker Red Label'   },
  { id: 'w2',   term: 'Johnnie Walker Black Label' },
  { id: 'w3',   term: 'Johnnie Walker Double Black'},
  { id: 'w4',   term: "Jack Daniel's Old No 7"     },
  { id: 'w5',   term: "Jack Daniel's Apple"        },
  { id: 'w6',   term: 'Chivas Regal 12'            },
  { id: 'w7',   term: 'Jameson whiskey'            },
  { id: 'w8',   term: 'Famous Grouse'              },
  { id: 'w9',   term: 'Glenfiddich 12'             },
  { id: 'w10',  term: 'Monkey Shoulder'            },
  // RON
  { id: 'r1',   term: 'Bacardi blanco 750'         },
  { id: 'r2',   term: 'Captain Morgan Spiced'      },
  { id: 'r3',   term: 'Havana Club 3 anos'         },
  { id: 'r4',   term: 'Flor de Cana 4'             },
  { id: 'r5',   term: 'Santa Teresa 1796'          },
  // VODKA
  { id: 'v1',   term: 'Smirnoff 750'               },
  { id: 'v2',   term: 'Absolut 750'                },
  { id: 'v3',   term: 'Grey Goose 750'             },
  { id: 'v4',   term: 'Belvedere 700'              },
  { id: 'v5',   term: 'Ciroc vodka'                },
  // TEQUILA
  { id: 't1',   term: 'Jose Cuervo Gold 750'       },
  { id: 't2',   term: 'Jose Cuervo Silver 750'     },
  { id: 't3',   term: 'Don Julio Blanco'           },
  { id: 't4',   term: 'Patron Silver'              },
  // VINO
  { id: 'vt1',  term: 'Casillero Cabernet 750'     },
  { id: 'vt2',  term: 'Frontera Merlot 750'        },
  { id: 'vt3',  term: 'Santa Rita 120 Cabernet'    },
  { id: 'vt4',  term: 'Gato Negro Cabernet'        },
  { id: 'vt5',  term: '1865 Cabernet'              },
  { id: 'vt6',  term: 'Casillero Sauvignon Blanc'  },
  { id: 'vt7',  term: 'Santa Carolina Chardonnay'  },
  { id: 'vt8',  term: 'Carta Vieja Rose'           },
  // ESPUMANTE
  { id: 'es1',  term: 'Valdivieso Extra Brut'      },
  { id: 'es2',  term: 'Undurraga Brut'             },
  { id: 'es3',  term: 'Chandon Brut'               },
  { id: 'es4',  term: 'Mumm Cordon Rouge'          },
  { id: 'es5',  term: 'Moet Chandon Brut'          },
  // APERITIVOS
  { id: 'ap1',  term: 'Aperol 700'                 },
  { id: 'ap2',  term: 'Campari 700'                },
  { id: 'ap3',  term: 'Ramazzotti 700'             },
  { id: 'ap4',  term: 'Fernet Branca 750'          },
  { id: 'ap5',  term: 'Jagermeister 700'           },
  { id: 'ap6',  term: 'Malibu coco 700'            },
  // LICORES
  { id: 'l1',   term: 'Baileys 700'                },
  { id: 'l2',   term: 'Kahlua cafe 700'            },
  { id: 'l3',   term: 'Amaretto Disaronno'         },
  { id: 'l4',   term: 'Licor 43 700'               },
  { id: 'l5',   term: 'Grand Marnier 700'          },
  { id: 'l6',   term: 'Cointreau 700'              },
  // CERVEZAS NUEVAS
  { id: 'bk1',  term: 'Becker lata 350'            },
  { id: 'bk2',  term: 'Royal Guard lata 350'       },
  { id: 'bk3',  term: 'Kunstmann Lager 500'        },
  { id: 'bk4',  term: 'Kunstmann IPA 330'          },
  { id: 'bk5',  term: 'Kunstmann Marzen 330'       },
  { id: 'bk6',  term: 'Kross 5 lager 330'          },
  { id: 'bk7',  term: 'Kross Marzen 330'           },
  { id: 'bk8',  term: 'Austral Lager 330'          },
  { id: 'bk9',  term: 'Patagonia Weisse 330'       },
  { id: 'bk10', term: 'Heineken lata 500'          },
  { id: 'bk11', term: 'Corona pack 6 botellas'     },
  { id: 'bk12', term: 'Stella Artois lata 500'     },
  { id: 'bk13', term: 'Miller Lite lata 355'       },
  { id: 'bk14', term: 'Coors Light lata 355'       },
  { id: 'bk15', term: 'Modelo Especial botella 355'},
  { id: 'bk16', term: 'Dos Equis lager 355'        },
  { id: 'bk17', term: 'Negra Modelo botella 355'   },
  { id: 'bk18', term: 'Guinness lata 440'          },
  { id: 'bk19', term: 'Leffe Blonde 330'           },
  { id: 'bk20', term: 'Hoegaarden 330'             },
  { id: 'bk21', term: 'Peroni Nastro Azzurro 330'  },
  { id: 'bk22', term: 'Becks botella 330'          },
  { id: 'bk23', term: 'Chimay Blue 330'            },
  { id: 'bk24', term: 'Quilmes lata 340'           },
  { id: 'bk25', term: 'Szot Pale Ale 330'          },
  { id: 'bk26', term: 'Kross Lupulus 330'          },
  { id: 'bk27', term: 'Austral Porter 330'         },
  // SIN ALCOHOL NUEVAS
  { id: 'sa6',  term: 'Morenita malta 350'         },
  { id: 'sa7',  term: 'Becks Blue sin alcohol 330' },
  { id: 'sa8',  term: 'Erdinger Alkoholfrei 500'   },
  { id: 'sa9',  term: 'Patagonia non alcoholic 355'},
  { id: 'rtd8', term: 'Heineken 0.0 limon 330'     },
  { id: 'rtd9', term: 'Corona Cero limon 330'      },
  // PISCO NUEVOS
  { id: 'pm1',  term: 'Capel Mosto Verde 750'      },
  { id: 'pm2',  term: 'Waqar Pisco 750'            },
  { id: 'pm3',  term: 'Kappa Pisco Reserva 750'    },
  { id: 'pm4',  term: 'Tres Erres Reservado 750'   },
  { id: 'pm5',  term: 'Alto del Carmen 40 750'     },
  { id: 'pm6',  term: 'Centinela pisco 35 750'     },
  { id: 'pm7',  term: 'Los Nichos pisco 35 750'    },
  // PISCO 1L
  { id: 'pl1',  term: 'Capel 35 1000ml'            },
  { id: 'pl2',  term: 'Capel 40 1000ml'            },
  { id: 'pl3',  term: 'Control C 35 1000ml'        },
  { id: 'pl4',  term: 'Alto del Carmen 35 1000ml'  },
  { id: 'pl5',  term: 'ABA pisco 35 1000ml'        },
  { id: 'pl6',  term: 'Mistral 35 1000ml'          },
  { id: 'pl7',  term: 'Tres Erres 35 1000ml'       },
  // GIN NUEVOS
  { id: 'gn1',  term: 'Tanqueray No Ten 750'       },
  { id: 'gn2',  term: 'Tanqueray Flor Sevilla 700' },
  { id: 'gn3',  term: 'Malfy Con Limone 700'       },
  { id: 'gn4',  term: 'Malfy Rosa gin 700'         },
  { id: 'gn5',  term: 'Roku Gin 700'               },
  { id: 'gn6',  term: 'The Botanist gin 700'       },
  { id: 'gn7',  term: 'Gin Mare 700'               },
  { id: 'gn8',  term: 'Beefeater Pink Gin 750'     },
  // SCOTCH BLEND NUEVOS
  { id: 'wb1',  term: "Ballantine's Finest 750"    },
  { id: 'wb2',  term: "Ballantine's 12 anos 750"   },
  { id: 'wb3',  term: 'J&B Rare 750'               },
  { id: 'wb4',  term: "William Lawson's 750"       },
  { id: 'wb5',  term: "Teacher's Highland Cream 750"},
  { id: 'wb6',  term: 'Label 5 whisky 750'         },
  { id: 'wb7',  term: "Grant's Triple Wood 750"    },
  { id: 'wb8',  term: "Dewar's White Label 750"    },
  { id: 'wb9',  term: "Dewar's 12 anos 750"        },
  { id: 'wb10', term: 'Johnnie Walker Green Label 750'},
  // SINGLE MALT NUEVOS
  { id: 'sm1',  term: 'Glenlivet 12 anos 700'      },
  { id: 'sm2',  term: 'Glenlivet 15 anos 700'      },
  { id: 'sm3',  term: 'Glenfiddich 15 anos 700'    },
  { id: 'sm4',  term: 'Glenfiddich 18 anos 700'    },
  { id: 'sm5',  term: 'Laphroaig 10 anos 700'      },
  { id: 'sm6',  term: 'Oban 14 anos 700'           },
  { id: 'sm7',  term: 'Macallan 12 Sherry Cask 700'},
  { id: 'sm8',  term: 'Dalmore 12 anos 700'        },
  { id: 'sm9',  term: 'Highland Park 12 anos 700'  },
  // BOURBON & IRISH NUEVOS
  { id: 'bi1',  term: "Jack Daniel's Single Barrel 750"},
  { id: 'bi2',  term: "Jack Daniel's Tennessee Honey 700"},
  { id: 'bi3',  term: 'Gentleman Jack 750'         },
  { id: 'bi4',  term: 'Jim Beam White 750'         },
  { id: 'bi5',  term: 'Jim Beam Black 750'         },
  { id: 'bi6',  term: "Maker's Mark bourbon 750"   },
  { id: 'bi7',  term: 'Bulleit Bourbon 750'        },
  { id: 'bi8',  term: 'Woodford Reserve 750'       },
  { id: 'bi9',  term: 'Wild Turkey 101 750'        },
  { id: 'bi10', term: 'Jameson Black Barrel 700'   },
  { id: 'bi11', term: 'Bushmills Original 700'     },
  { id: 'bi12', term: 'Tullamore DEW 700'          },
  // WHISKY JAPONES NUEVOS
  { id: 'wj1',  term: 'Suntory Toki 700'           },
  { id: 'wj2',  term: 'Nikka From the Barrel 500'  },
  { id: 'wj3',  term: 'Nikka Days 700'             },
  { id: 'wj4',  term: 'Yamazaki 12 anos 700'       },
  { id: 'wj5',  term: 'Hibiki Harmony 700'         },
  { id: 'wj6',  term: 'Iwai Tradition whisky 750'  },
  // RON NUEVOS
  { id: 'rn1',  term: 'Bacardi Oro ron 750'        },
  { id: 'rn2',  term: 'Bacardi 8 anos ron 700'     },
  { id: 'rn3',  term: 'Captain Morgan Black 750'   },
  { id: 'rn4',  term: 'Havana Club Anejo 7 anos 700'},
  { id: 'rn5',  term: 'Flor de Cana 7 anos 700'    },
  { id: 'rn6',  term: 'Zacapa 23 Solera 750'       },
  { id: 'rn7',  term: 'Diplomatico Reserva Exclusiva 700'},
  { id: 'rn8',  term: 'Appleton Estate Signature 700'},
  { id: 'rn9',  term: 'Don Papa ron 700'           },
  { id: 'rn10', term: 'Brugal Anejo 700'           },
  // VODKA NUEVOS
  { id: 'vn1',  term: 'Smirnoff vodka 1L'          },
  { id: 'vn2',  term: 'Ketel One vodka 700'        },
  { id: 'vn3',  term: 'Russian Standard 750'       },
  { id: 'vn4',  term: 'Stolichnaya vodka 750'      },
  { id: 'vn5',  term: 'Crystal Head vodka 700'     },
  { id: 'vn6',  term: "Tito's Handmade vodka 750"  },
  // TEQUILA NUEVOS
  { id: 'tn1',  term: 'Don Julio Reposado 750'     },
  { id: 'tn2',  term: 'Don Julio Anejo 700'        },
  { id: 'tn3',  term: 'Patron Reposado tequila 750'},
  { id: 'tn4',  term: '1800 Silver tequila 750'    },
  { id: 'tn5',  term: 'Olmeca Gold tequila 750'    },
  { id: 'tn6',  term: 'El Jimador Silver 750'      },
  { id: 'tn7',  term: 'Cazadores Reposado 750'     },
  { id: 'tn8',  term: 'Herradura Reposado 750'     },
  { id: 'tn9',  term: 'Espolon Blanco tequila 750' },
  { id: 'tn10', term: 'Cuervo Tradicional Reposado 750'},
  // MEZCAL NUEVOS
  { id: 'mz1',  term: 'Del Maguey Vida mezcal 700' },
  { id: 'mz2',  term: 'El Silencio Espadin mezcal 700'},
  { id: 'mz3',  term: 'Banhez Mezcal 700'          },
  { id: 'mz4',  term: 'Wahaka Espadin mezcal 700'  },
  { id: 'mz5',  term: 'Montelobos Espadin mezcal 700'},
  // VINO NUEVOS
  { id: 'vi1',  term: 'Marques de Casa Concha Cabernet 750'},
  { id: 'vi2',  term: 'Montes Alpha Cabernet 750'  },
  { id: 'vi3',  term: 'Montes Classic Cabernet 750'},
  { id: 'vi4',  term: 'Errazuriz Estate Cabernet 750'},
  { id: 'vi5',  term: 'Cono Sur Reserva Carmenere 750'},
  { id: 'vi6',  term: 'Undurraga TH Cabernet 750'  },
  { id: 'vi7',  term: 'Santa Ema Reserva Merlot 750'},
  { id: 'vi8',  term: 'MontGras Reserva Carmenere 750'},
  { id: 'vi9',  term: 'Emiliana Organico Carmenere 750'},
  { id: 'vi10', term: 'Casillero Carmenere 750'    },
  { id: 'vi11', term: 'Frontera Cabernet 1.5L'     },
  { id: 'vi12', term: 'William Cole Syrah Reserva 750'},
  { id: 'vi13', term: 'Los Vascos Gran Reserva 750'},
  { id: 'vi14', term: 'Matetic Corralillo Blend 750'},
  { id: 'vi15', term: 'Santa Rita Reserva Chardonnay 750'},
  // ESPUMANTE NUEVOS
  { id: 'esp1', term: 'Freixenet Cordon Negro Brut 750'},
  { id: 'esp2', term: 'Codorniu Clasico Brut 750'  },
  { id: 'esp3', term: 'Chandon Rose espumante 750' },
  { id: 'esp4', term: 'Veuve Clicquot Yellow Label 750'},
  { id: 'esp5', term: 'Valdivieso Blanc de Blancs 750'},
  // APERITIVOS NUEVOS
  { id: 'apn1', term: 'Select Aperitivo 700'       },
  { id: 'apn2', term: 'Cynar aperitivo 700'        },
  { id: 'apn3', term: 'Montenegro Amaro 700'       },
  { id: 'apn4', term: 'Suze aperitivo 700'         },
  { id: 'apn5', term: "Pimm's No 1 700"            },
  // LICORES NUEVOS
  { id: 'ln1',  term: 'Frangelico 700'             },
  { id: 'ln2',  term: 'Midori Melon 700'           },
  { id: 'ln3',  term: 'Chambord 500'               },
  { id: 'ln4',  term: 'St Germain Elderflower 700' },
  { id: 'ln5',  term: 'Limoncello Pallini 500'     },
  { id: 'ln6',  term: 'Sambuca Molinari 700'       },
  { id: 'ln7',  term: 'Drambuie 700'               },
  { id: 'ln8',  term: 'Southern Comfort 750'       },
  // COGNAC & BRANDY NUEVOS
  { id: 'cog1', term: 'Hennessy VS cognac 700'     },
  { id: 'cog2', term: 'Hennessy VSOP 700'          },
  { id: 'cog3', term: 'Remy Martin VSOP 700'       },
  { id: 'cog4', term: 'Courvoisier VSOP 700'       },
  { id: 'cog5', term: 'Torres 10 brandy 700'       },
  { id: 'cog6', term: 'Cardenal Mendoza brandy 700'},
  { id: 'cog7', term: 'Martell VS cognac 700'      },
  // VERMUT NUEVOS
  { id: 'vmt1', term: 'Martini Bianco 750'         },
  { id: 'vmt2', term: 'Martini Rosso vermut 750'   },
  { id: 'vmt3', term: 'Martini Extra Dry 750'      },
  { id: 'vmt4', term: 'Martini Rosato 750'         },
  { id: 'vmt5', term: 'Cinzano Bianco 750'         },
  { id: 'vmt6', term: 'Noilly Prat Extra Dry 750'  },
  { id: 'vmt7', term: 'Martini Aperitivo Spritz 750'},
  // RTD NUEVOS
  { id: 'rtd1', term: 'Smirnoff Ice Limon 275'     },
  { id: 'rtd2', term: 'Smirnoff Ice Tropical 275'  },
  { id: 'rtd3', term: 'Bacardi Breezer Naranja 275'},
  { id: 'rtd4', term: 'Pisco Sour Don Homero lata 250'},
  { id: 'rtd5', term: 'Fernet Coca-Cola lata 310'  },
  { id: 'rtd6', term: "Jack Daniel's Coca-Cola lata 330"},
  { id: 'rtd7', term: 'Hard Seltzer Gato Negro 330'},
];

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TIENDAS
// ═══════════════════════════════════════════════════════════════
const STORE_CONFIGS = {
  // ── Unimarc BFF API (via Puppeteer fetch interno) ────────
  unimarc: {
    name: 'Unimarc',
    type: 'unimarc_bff',
    homeUrl: 'https://www.unimarc.cl',
    baseUrl: 'https://www.unimarc.cl',
  },
  // ── Jumbo via Puppeteer (Tailwind classes, outer <a> wraps product) ──
  jumbo: {
    name: 'Jumbo',
    type: 'puppeteer',
    searchUrl: q => `https://www.jumbo.cl/busca/?ft=${encodeURIComponent(q)}`,
    waitSelector: '.plp_card, a[class*="no-underline"][href*="/p"]',
    itemSelector: 'a[class*="no-underline"][href*="/p"]',
    nameSelectors: ['.product-card-name', '[class*="product-card-name"]'],
    priceSelectors: ['[class*="font-bold"][class*="neutral700"]', '[class*="font-bold"][class*="text-lg"]', '.plp_card [class*="font-bold"]'],
    linkSelectors: ['a[href*="/p"]'],
    imageSelectors: ['img[class*="product"]', 'img[src*="jumbo"]', 'img[src*="vtex"]', 'img[alt]'],
    baseUrl: 'https://www.jumbo.cl',
  },
  // ── Lider (Walmart Chile / super.lider.cl) ───────────────
  lider: {
    name: 'Lider',
    type: 'puppeteer',
    searchUrl: q => `https://super.lider.cl/search?q=${encodeURIComponent(q)}`,
    waitSelector: '[data-testid="list-view"]',
    itemSelector: '[data-testid="list-view"] > div, [data-testid="result-item"], .search-results-list > div',
    nameSelectors: ['a[href*="/ip/"] span', 'h3', '[class*="product-title"]', 'span[class*="title"]'],
    priceSelectors: ['div[class*="lh-copy"][class*="mr1"]', 'div[class*="lh-copy"]', '[class*="price"]'],
    linkSelectors: ['a[href*="/ip/"]', 'a'],
    imageSelectors: ['img[src*="lider"]', 'img[data-testid]', 'img[alt]'],
    waitSelectorTimeout: 25000,
    baseUrl: 'https://super.lider.cl',
  },
  // ── Puppeteer stores ─────────────────────────────────────
  labarra: {
    name: 'La Barra',
    type: 'labarra_api',
    baseUrl: 'https://labarra.cl',
  },
  descorcha: {
    name: 'Descorcha',
    type: 'shopify',
    baseUrl: 'https://descorcha.com',
  },
  operals: {
    name: 'Operals',
    type: 'shopify',
    baseUrl: 'https://www.operals.cl',
  },
  elbrindis: {
    name: 'El Brindis',
    type: 'puppeteer',
    searchUrl: q => `https://www.elbrindis.cl/?s=${encodeURIComponent(q)}&post_type=product`,
    waitSelector: 'li.product, .products > li, .product-grid-item',
    itemSelector: 'li.product, .products > li, .product-grid-item',
    nameSelectors: ['.woocommerce-loop-product__title', 'h2.product-title', '.product-title', 'h2', 'h3'],
    priceSelectors: ['.price ins .amount', '.price .amount', 'span.price', '.price', 'bdi'],
    linkSelectors: ['a.woocommerce-loop-product__link', 'a[href*="/product"]', 'a'],
    imageSelectors: ['img.attachment-woocommerce_thumbnail', 'img.wp-post-image', 'img[src*="elbrindis"]', 'img'],
    baseUrl: 'https://www.elbrindis.cl',
  },
  tost: {
    name: 'Tost',
    type: 'shopify',
    baseUrl: 'https://tost.cl',
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Convierte texto de precio chileno a número: "$12.990" → 12990
 *  Extrae el PRIMER precio si hay varios concatenados (ej: "$4.690$5.990" → 4690)
 */
function parseCLPPrice(text) {
  if (!text) return null;
  // Intentar extraer el primer precio en formato CLP ($X.XXX o $XX.XXX)
  const match = text.match(/\$\s*(\d{1,3}(?:\.\d{3})+)/);
  if (match) {
    const num = parseInt(match[1].replace(/\./g, ''), 10);
    if (num >= 300 && num <= 500000) return num;
  }
  // Fallback: extraer el primer número razonable
  const numMatch = text.match(/(\d{3,6})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 300 && num <= 500000) return num;
  }
  return null;
}

/** Extrae tamaño de pack del nombre del producto: "24x Cerveza" → 24, "Pack 12 un" → 12 */
function parsePackSize(name) {
  if (!name) return 1;
  const n = name.toLowerCase();
  const match = n.match(/(?:^|\s)(\d{1,3})\s*x\s/i) ||
                n.match(/\bx(\d{1,3})\b/i) ||
                n.match(/pack\s*(?:de\s*)?(\d{1,3})\b/i) ||
                n.match(/(\d{1,3})\s*(?:un(?:idades?)?|latas|botellas|cervezas?|packs?)\b/i) ||
                n.match(/(\d{1,3})\s*-\s*(?:cervezas?|latas|botellas|un)/i) ||
                n.match(/(?:caja|box)\s*(?:de\s*)?(\d{1,3})\b/i);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 2 && val <= 100) return val;
  }
  return 1;
}

/** Extrae volumen en ml del nombre: "350ml" → 350, "1L" → 1000, "750 cc" → 750 */
function parseVolume(name) {
  if (!name) return null;
  const literMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(?:lt?|litros?)\b/i);
  if (literMatch) return Math.round(parseFloat(literMatch[1].replace(',', '.')) * 1000);
  const mlMatch = name.match(/(\d{2,4})\s*(?:ml|cc|cl)\b/i);
  if (mlMatch) {
    const val = parseInt(mlMatch[1]);
    if (val >= 50 && val <= 5000) return val;
  }
  // Número suelto al final que parece volumen (ej: "Escudo lata 350")
  const numMatch = name.match(/\b(\d{3,4})\s*$/);
  if (numMatch) {
    const val = parseInt(numMatch[1]);
    if (val >= 100 && val <= 2000) return val;
  }
  return null;
}

/** Enriquece un resultado con precio unitario y precio/litro */
function enrichResult(result, product) {
  const packSize = parsePackSize(result.name);
  const volume = parseVolume(result.name) || (product && parseVolume(product.term)) || null;
  const unitPrice = packSize > 1 ? Math.round(result.price / packSize) : result.price;
  const pricePerLiter = volume ? Math.round((unitPrice / volume) * 1000) : null;
  return { ...result, packSize, volume, unitPrice, pricePerLiter };
}

/** Palabras modificadoras que cambian la identidad del producto */
const VARIANT_MODIFIERS = ['sweet','honey','apple','manzana','limon','tropical','cherry','zero','0.0','sin alcohol','non alcoholic','alkoholfrei','light','lite','rose','rosé','pink'];

/** Extrae la marca del término de búsqueda (puede ser multi-palabra) */
function extractBrand(term) {
  const t = term.toLowerCase().replace(/[°'"]/g, '');
  // Marcas conocidas de múltiples palabras (en orden de largo)
  const multiWordBrands = [
    'alto del carmen','jack daniels','jack daniel','johnny walker','johnnie walker',
    'don julio','jose cuervo','grey goose','captain morgan','havana club',
    'flor de cana','santa teresa','santa rita','santa carolina','santa ema',
    'concha y toro','casillero del diablo','carta vieja','gato negro',
    'royal guard','stella artois','modelo especial','negra modelo','dos equis',
    'monkey shoulder','monkey 47','famous grouse','makers mark','maker\'s mark',
    'wild turkey','jim beam','chivas regal','control c','gran mistral',
    'tres erres','los nichos','st germain','don papa','crystal head',
    'russian standard','del maguey','el silencio','noilly prat',
    'moët chandon','moet chandon','veuve clicquot','fernet branca',
    'grand marnier','licor 43','label 5','bombay sapphire',
    'ketel one','flor de caña',
  ];
  for (const mb of multiWordBrands) {
    if (t.includes(mb)) return mb;
  }
  // Fallback: primera palabra
  return t.split(/\s+/)[0];
}

/** Scoring inteligente: elige el mejor match de una lista de resultados para un query dado */
function scoreBestMatch(results, query) {
  const queryClean = query.toLowerCase().replace(/[°'"]/g, '');
  const words = queryClean.split(/\s+/).filter(w => w.length > 2);
  const brand = extractBrand(query);
  const brandWords = brand.split(/\s+/);

  // Detectar modificadores presentes en el query
  const queryModifiers = VARIANT_MODIFIERS.filter(m => queryClean.includes(m));

  let best = null;
  let bestScore = -999;

  for (const r of results) {
    const nameLower = (r.name || r.title || '').toLowerCase().replace(/[°'"]/g, '');
    const haystack = (nameLower + ' ' + (r.href || '')).toLowerCase()
      .replace(/(\d+)\s+(ml|cc|cl)\b/g, '$1$2');

    // Score base: palabras del query que aparecen en el resultado
    let score = words.filter(w => haystack.includes(w)).length;

    // Penalizar si el resultado tiene modificadores que NO están en el query
    for (const mod of VARIANT_MODIFIERS) {
      const inResult = nameLower.includes(mod);
      const inQuery = queryModifiers.includes(mod);
      if (inResult && !inQuery) score -= 3;
      if (!inResult && inQuery) score -= 2;
    }

    // Penalizar si "sin alcohol" o "0.0" en resultado pero no en query
    if ((nameLower.includes('sin alcohol') || nameLower.includes('0.0') || nameLower.includes('0,0%')) && !queryClean.includes('sin alcohol') && !queryClean.includes('0.0')) {
      score -= 5;
    }

    // Bonus si la marca aparece
    const brandMatch = brandWords.every(w => nameLower.includes(w));
    if (brandMatch) score += 1;

    if (score > bestScore) { bestScore = score; best = r; }
  }

  // Requiere al menos 2 palabras en común
  if (!best || bestScore < 2) return null;

  // Validar marca: todas las palabras de la marca deben estar en el resultado
  const bestName = (best.name || best.title || '').toLowerCase().replace(/[°'"]/g, '');
  if (brand.length >= 3 && !brandWords.every(w => bestName.includes(w))) return null;

  return best;
}

/** Limpia término de búsqueda: quita °, ', caracteres especiales que rompen APIs */
function cleanSearchTerm(term) {
  return term.replace(/[°'"''""]/g, '').replace(/\s+/g, ' ').trim();
}

/** Axios request con headers realistas */
async function httpGet(url, extraHeaders = {}) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'es-CL,es;q=0.9',
      ...extraHeaders,
    },
    timeout: 20000,
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER: UNIMARC BFF (cookies capturadas de Puppeteer → axios)
// ═══════════════════════════════════════════════════════════════
async function scrapeUnimarcBFF(unimarcSession, query) {
  // Usar axios con las cookies de sesión capturadas al inicio
  let data;
  try {
    const resp = await axios.post(
      'https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search',
      { from: '0', orderBy: '', searching: query, promotionsOnly: false, to: '8', userTriggered: true },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': randomUA(),
          'Origin': 'https://www.unimarc.cl',
          'Referer': 'https://www.unimarc.cl/',
          'channel': 'UNIMARC',
          'source': 'web',
          'version': '1.0.0',
          'session': unimarcSession.sessionNanoId,
          'anonymous': unimarcSession.sessionAnonymousId,
          'Cookie': unimarcSession.cookieString,
        },
      }
    );
    data = resp.data;
  } catch (e) {
    log.warn(`[Unimarc BFF] ${query}: ${e.message?.slice(0, 200)}`);
    return null;
  }

  if (!data || !Array.isArray(data.availableProducts) || !data.availableProducts.length) return null;

  // Mapear a formato compatible con scoreBestMatch
  const candidates = data.availableProducts.map(p => ({
    ...p,
    name: p.item?.nameComplete || '',
    _original: p,
  }));
  const bestCandidate = scoreBestMatch(candidates, query);
  if (!bestCandidate) return null;
  const best = bestCandidate._original || bestCandidate;

  const price = parseCLPPrice(best.price?.price);
  if (!price) return null;

  const slug = best.item?.slug || ''; // ya incluye el /p final, ej: "/cerveza-escudo/p"
  const imageRaw = best.item?.images?.[0];
  const image = typeof imageRaw === 'string' ? imageRaw : (imageRaw?.imageUrl || null);

  return {
    name: best.item?.nameComplete || query,
    price,
    url: slug ? `https://www.unimarc.cl${slug}` : `https://www.unimarc.cl/search?q=${encodeURIComponent(query)}`,
    image,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER: LA BARRA (API CCU via Puppeteer fetch interno)
// ═══════════════════════════════════════════════════════════════
async function scrapeLabarraAPI(page, query) {
  const data = await page.evaluate(async (q) => {
    try {
      const resp = await fetch('https://gtw.gke.cloudccu.cl/dev/private/v1.0.0/products_labarra/v2/getProductList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          is_express: false, category: [], filters: {}, sort_by: '',
          page: 1, pagination: 10,
          image_size_main: 'image_256', image_size_secondary: 'image_256',
          location: '545', search: q, source: 'web',
        }),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch { return null; }
  }, query);

  const products = data?.products || data?.results;
  if (!Array.isArray(products) || !products.length) return null;

  const best = scoreBestMatch(products, query);
  if (!best) return null;

  const price = parseCLPPrice(String(best.price_normal || best.price || ''));
  if (!price) return null;

  const handle = best.slug || best.handle || '';
  return {
    name: best.name || best.title || query,
    price,
    url: handle ? `https://labarra.cl/products/${handle}` : `https://labarra.cl/buscar?q=${encodeURIComponent(query)}`,
    image: best.image_main || best.image || null,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER: SHOPIFY (Descorcha, Operals y otros)
// Usa Predictive Search API que funciona en Shopify 2.0+
// ═══════════════════════════════════════════════════════════════
async function scrapeShopify(config, query) {
  const url = `${config.baseUrl}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=5`;
  const data = await httpGet(url, { 'Referer': config.baseUrl + '/' });

  const products = data?.resources?.results?.products;
  if (!products?.length) return null;

  // Elegir el resultado más relevante
  const candidates = products.map(p => ({ ...p, name: p.title || '' }));
  const best = scoreBestMatch(candidates, query);
  if (!best) return null;

  // El precio viene como número entero en CLP
  const priceRaw = best.price;
  const price = priceRaw ? Math.round(parseFloat(String(priceRaw).replace(',', '.'))) : null;
  if (!price || price < 100) return null;

  const handle = best.handle || (best.url || '').split('/products/')[1] || '';
  return {
    name: best.title,
    price,
    url: handle ? `${config.baseUrl}/products/${handle}` : (best.url || `${config.baseUrl}/search?q=${encodeURIComponent(query)}`),
    image: best.featured_image?.url || best.image || null,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER: PUPPETEER genérico
// ═══════════════════════════════════════════════════════════════
async function scrapePuppeteer(page, config, query) {
  const url = config.searchUrl(query);
  try {
    await page.goto(url, {
      waitUntil: config.gotoWaitUntil || 'domcontentloaded',
      timeout: config.gotoWaitUntil === 'networkidle2' ? 45000 : 30000,
    });
  } catch (e) {
    log.warn(`[${config.name}] goto timeout ${query}: ${e.message?.slice(0, 200)}`);
  }
  await DELAY(1500);

  // Esperar que aparezcan los productos
  try {
    await page.waitForSelector(config.waitSelector, { timeout: config.waitSelectorTimeout || 10000 });
  } catch (e) {
    log.warn(`[${config.name}] waitForSelector ${query}: ${e.message?.slice(0, 200)}`);
    return null;
  }

  await DELAY(300);

  // Extraer todos los resultados y elegir el más relevante
  const imgSelectors = config.imageSelectors || [];
  const results = await page.evaluate((itemSelector, nameSelectors, priceSelectors, linkSelectors, imageSelectors) => {
    function queryFirst(root, selectors) {
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel);
          if (el && el.textContent.trim()) return el;
        } catch {}
      }
      return null;
    }

    const items = [...document.querySelectorAll(itemSelector)].slice(0, 8);
    return items.map(item => {
      const nameEl = queryFirst(item, nameSelectors);
      const priceEl = queryFirst(item, priceSelectors);

      // Nombre: textContent del elemento, o alt de imagen como fallback
      const name = nameEl?.textContent?.trim()
        || item.querySelector('img[alt]')?.getAttribute('alt')?.trim()
        || '';

      // Href: buscar sin requerir textContent (links que envuelven imágenes también valen)
      let href = '';
      if (item.tagName === 'A') {
        href = item.getAttribute('href') || '';
      } else {
        for (const sel of linkSelectors) {
          try {
            const el = item.querySelector(sel);
            const h = el?.getAttribute('href');
            if (h) { href = h; break; }
          } catch {}
        }
        if (!href) href = item.querySelector('a')?.getAttribute('href') || '';
      }

      // Para precios con text-nodes mixtos (ej. Jumbo: "$4.690<span>$5.990</span>")
      // usar el primer text node del elemento precio para evitar concatenar precios
      let priceText = '';
      if (priceEl) {
        const firstTextNode = [...priceEl.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        priceText = firstTextNode ? firstTextNode.textContent.trim() : priceEl.textContent.trim();
      }

      // Imagen: intentar cada selector de imagen
      let imgSrc = '';
      for (const sel of imageSelectors) {
        try {
          const imgEl = item.querySelector(sel);
          const src = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');
          if (src && (src.startsWith('http') || src.startsWith('//'))) {
            imgSrc = src.startsWith('//') ? 'https:' + src : src;
            break;
          }
        } catch {}
      }

      return { name, priceText, href, imgSrc };
    }).filter(r => r.priceText);
  }, config.itemSelector, config.nameSelectors, config.priceSelectors, config.linkSelectors, imgSelectors);

  if (!results.length) return null;

  // Elegir el resultado cuyo nombre/URL coincida mejor con el query
  const best = scoreBestMatch(results, query);
  if (!best) return null;

  const price = parseCLPPrice(best.priceText);
  if (!price) return null;

  let finalUrl = best.href || url;
  if (finalUrl && !finalUrl.startsWith('http')) finalUrl = config.baseUrl + finalUrl;

  return {
    name: best.name || query,
    price,
    url: finalUrl,
    image: best.imgSrc || null,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS: RETRY + CONCURRENCIA
// ═══════════════════════════════════════════════════════════════

async function withRetry(fn, attempts, delayMs) {
  for (let i = 0; i <= attempts; i++) {
    try {
      const result = await fn();
      if (result !== null) return result;
      if (i < attempts) await DELAY(delayMs);
    } catch (e) {
      if (i === attempts) throw e;
      log.warn(`Reintentando (${i + 1}/${attempts}): ${e.message?.slice(0, 100)}`);
      await DELAY(delayMs);
    }
  }
  return null;
}

class Semaphore {
  constructor(max) { this.max = max; this.count = 0; this.queue = []; }
  async acquire() {
    if (this.count < this.max) { this.count++; return; }
    await new Promise(resolve => this.queue.push(resolve));
  }
  release() {
    this.count--;
    if (this.queue.length) { this.count++; this.queue.shift()(); }
  }
}

// ═══════════════════════════════════════════════════════════════
// ORQUESTADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════
async function scrapeAll({ onlyStore = null, enabledStores = null, enabledProducts = null, onProgress, onResult, onError } = {}) {
  const productList = enabledProducts ? PRODUCTS.filter(p => enabledProducts.includes(p.id)) : PRODUCTS;

  let storeIds = onlyStore
    ? (STORE_CONFIGS[onlyStore] ? [onlyStore] : [])
    : Object.keys(STORE_CONFIGS);
  if (!onlyStore && enabledStores) storeIds = storeIds.filter(id => enabledStores.includes(id));

  const total = productList.length * storeIds.length;
  let done = 0;
  const prices = {};

  // Inicializar estructura
  for (const p of productList) prices[p.id] = {};

  // Lanzar Puppeteer una sola vez para todos los stores que lo necesiten
  const puppeteerStoreIds = storeIds.filter(id => STORE_CONFIGS[id].type === 'puppeteer');
  const unimarcBFFStoreIds = storeIds.filter(id => STORE_CONFIGS[id].type === 'unimarc_bff');
  const labarraStoreIds = storeIds.filter(id => STORE_CONFIGS[id].type === 'labarra_api');
  let browser = null;
  const pages = {}; // storeId → page
  const unimarcSessions = {}; // storeId → { sessionNanoId, sessionAnonymousId, cookieString }

  const needsBrowser = puppeteerStoreIds.length > 0 || unimarcBFFStoreIds.length > 0 || labarraStoreIds.length > 0;

  if (needsBrowser) {
    log.info('Iniciando navegador Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // Inicializar páginas para stores Puppeteer normales
    for (const sid of puppeteerStoreIds) {
      pages[sid] = await browser.newPage();
      await pages[sid].setUserAgent(randomUA());
      await pages[sid].setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });
    }

    // Para La Barra API: crear página para ejecutar fetch interno
    for (const sid of labarraStoreIds) {
      pages[sid] = await browser.newPage();
      await pages[sid].setUserAgent(randomUA());
      await pages[sid].setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });
      try {
        await pages[sid].goto('https://labarra.cl', { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch {}
    }

    // Para Unimarc BFF: cargar homepage, extraer cookies y cerrar la página
    for (const sid of unimarcBFFStoreIds) {
      const config = STORE_CONFIGS[sid];
      log.info('Cargando Unimarc para obtener sesión...');
      try {
        const tempPage = await browser.newPage();
        await tempPage.setUserAgent(randomUA());
        await tempPage.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' });
        await tempPage.goto(config.homeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await DELAY(3000); // esperar cookies de sesión

        const cookies = await tempPage.cookies();
        const sessionNanoId = cookies.find(c => c.name === 'sessionNanoId')?.value || '';
        const sessionAnonymousId = cookies.find(c => c.name === 'sessionAnonymousId')?.value || '';
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        unimarcSessions[sid] = { sessionNanoId, sessionAnonymousId, cookieString };
        await tempPage.close();
        log.info(`Sesión Unimarc obtenida (${sessionNanoId.substring(0, 8)}...)`);
      } catch (e) {
        log.warn('No se pudo obtener sesión Unimarc:', e.message?.slice(0, 100));
        unimarcSessions[sid] = { sessionNanoId: '', sessionAnonymousId: '', cookieString: '' };
      }
    }
  }

  const sem = new Semaphore(defaults.MAX_CONCURRENT_STORES);

  try {
    // Procesar cada producto
    for (const product of productList) {
      // Scraping de todas las tiendas para este producto (con concurrencia controlada)
      const tasks = storeIds.map(async (storeId) => {
        const config = STORE_CONFIGS[storeId];
        await sem.acquire();
        try {
          const searchTerm = cleanSearchTerm(product.term);
          onProgress?.(Math.round((done / total) * 100), config.name, searchTerm);

          let result = null;

          const scrapeWithTimeout = (fn) => {
            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), defaults.STORE_TIMEOUT));
            return Promise.race([fn(), timeout]);
          };

          if (config.type === 'unimarc_bff') {
            result = await withRetry(
              () => scrapeWithTimeout(() => scrapeUnimarcBFF(unimarcSessions[storeId], searchTerm)),
              defaults.RETRY_ATTEMPTS, defaults.RETRY_DELAY_MS
            );
            await DELAY(150);

          } else if (config.type === 'labarra_api') {
            result = await withRetry(
              () => scrapeWithTimeout(() => scrapeLabarraAPI(pages[storeId], searchTerm)),
              defaults.RETRY_ATTEMPTS, defaults.RETRY_DELAY_MS
            );
            await DELAY(200);

          } else if (config.type === 'shopify') {
            result = await withRetry(
              () => scrapeWithTimeout(() => scrapeShopify(config, searchTerm)),
              defaults.RETRY_ATTEMPTS, defaults.RETRY_DELAY_MS
            );
            await DELAY(400);

          } else if (config.type === 'puppeteer') {
            // Puppeteer usa page compartida — no reintentar (page state se comparte)
            result = await scrapeWithTimeout(() => scrapePuppeteer(pages[storeId], config, searchTerm));
            await DELAY(400);
          }

          if (result) {
            prices[product.id][storeId] = enrichResult(result, product);
            onResult?.(true);
            log.info(`[${config.name}] ${product.term} → $${result.price.toLocaleString('es-CL')}${result.packSize > 1 ? ` (pack ${result.packSize})` : ''}`);
          } else {
            onResult?.(false);
          }

        } catch (err) {
          onError?.();
          log.warn(`[${config.name}] ${product.term}: ${err.message?.slice(0, 200)}`);
        } finally {
          sem.release();
          done++;
        }
      });

      // Esperar todas las tiendas para este producto antes de pasar al siguiente
      await Promise.allSettled(tasks);
      onProgress?.(Math.round((done / total) * 100), '', product.term);
    }
  } finally {
    // Cerrar browser (ignorar errores EBUSY de Windows con archivos temp)
    if (browser) {
      log.info('Cerrando navegador...');
      try {
        await browser.close();
      } catch (e) {
        // En Windows puede aparecer EBUSY al liberar archivos temp de Chrome — ignorar
      }
    }
  }

  return prices;
}

module.exports = { scrapeAll, PRODUCTS, parsePackSize, parseVolume, enrichResult, scoreBestMatch };
