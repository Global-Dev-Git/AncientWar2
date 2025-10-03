export type LocaleKey = 'en' | 'sv-SE'

export type TranslationKey =
  | 'app.title'
  | 'app.save'
  | 'app.load'
  | 'app.endTurn'
  | 'app.toggleMap'
  | 'app.quickSave'
  | 'app.actionsRemaining'
  | 'app.turn'
  | 'app.treasury'
  | 'app.map.political'
  | 'app.map.stability'
  | 'app.map.strategic'
  | 'hud.actions'
  | 'hud.stability'
  | 'hud.research'
  | 'hud.influence'
  | 'hud.population'
  | 'hud.overview'
  | 'hud.actionsLeft'
  | 'nationSelect.heading'
  | 'nationSelect.choose'
  | 'nationSelect.title'
  | 'nationSelect.subtitle'
  | 'nationSelect.territories'
  | 'nationSelect.stabilityLabel'
  | 'nationSelect.advantages'
  | 'nationSelect.disadvantages'
  | 'actionMenu.title'
  | 'actionMenu.remaining'
  | 'actionModal.confirm'
  | 'actionModal.cancel'
  | 'actions.sourceTerritory'
  | 'actions.targetTerritory'
  | 'actions.targetNation'
  | 'actions.selectTerritory'
  | 'actions.selectTarget'
  | 'actions.chooseNation'
  | 'actions.ownership.friendly'
  | 'actions.ownership.enemy'
  | 'diplomacy.title'
  | 'diplomacy.relationships'
  | 'diplomacy.status.war'
  | 'diplomacy.status.alliance'
  | 'eventLog.title'
  | 'eventLog.empty'
  | 'notifications.autosave'
  | 'notifications.quicksave'
  | 'notifications.manualsave'
  | 'settings.theme'
  | 'settings.colorblind'
  | 'settings.language'
  | 'settings.tooltips'
  | 'settings.tooltips.basic'
  | 'settings.tooltips.deep'
  | 'settings.hotkeys'
  | 'settings.hotkey.rebind'
  | 'settings.hotkey.press'
  | 'settings.audio'
  | 'settings.audio.mute'
  | 'settings.audio.unmute'
  | 'settings.audio.volume'
  | 'economy.title'
  | 'economy.tradeRoutes'
  | 'economy.income'
  | 'economy.expenses'
  | 'economy.trade.agreements'
  | 'economy.trade.maritime'
  | 'economy.trade.land'
  | 'court.title'
  | 'court.factions'
  | 'court.influence'
  | 'court.risks'
  | 'tech.title'
  | 'tech.progress'
  | 'tech.completed'
  | 'missions.title'
  | 'missions.active'
  | 'missions.completed'
  | 'overlays.title'
  | 'overlays.select'
  | 'minimap.title'
  | 'achievements.title'
  | 'achievements.locked'
  | 'achievements.unlocked'
  | 'achievements.entry.first-blood'
  | 'achievements.entry.strategist'
  | 'achievements.entry.master-diplomat'
  | 'codex.title'
  | 'codex.searchPlaceholder'
  | 'codex.back'
  | 'codex.section.economy'
  | 'codex.section.military'
  | 'codex.section.politics'
  | 'codex.section.technology'
  | 'codex.section.diplomacy'
  | 'codex.entry.tradeEfficiency.title'
  | 'codex.entry.tradeEfficiency.body'
  | 'codex.entry.armyComposition.title'
  | 'codex.entry.armyComposition.body'
  | 'codex.entry.senateSupport.title'
  | 'codex.entry.senateSupport.body'
  | 'codex.entry.researchPriorities.title'
  | 'codex.entry.researchPriorities.body'
  | 'codex.entry.allianceWeb.title'
  | 'codex.entry.allianceWeb.body'
  | 'screenshot.title'
  | 'screenshot.capture'
  | 'performance.title'
  | 'performance.fps'
  | 'performance.turnTime'
  | 'performance.lastSave'
  | 'confirm.quit'
  | 'autosave.prompt'
  | 'quicksave.prompt'
  | 'overlays.map.political'
  | 'overlays.map.stability'
  | 'overlays.map.economic'
  | 'missions.none'
  | 'tech.none'
  | 'economy.noRoutes'
  | 'court.noFactions'
  | 'achievements.none'
  | 'stats.stability'
  | 'stats.military'
  | 'stats.tech'
  | 'stats.economy'
  | 'stats.crime'
  | 'stats.influence'
  | 'stats.support'
  | 'stats.science'
  | 'stats.laws'
  | 'actions.label.InvestInTech'
  | 'actions.label.RecruitArmy'
  | 'actions.label.MoveArmy'
  | 'actions.label.CollectTaxes'
  | 'actions.label.PassLaw'
  | 'actions.label.Spy'
  | 'actions.label.DiplomacyOffer'
  | 'actions.label.DeclareWar'
  | 'actions.label.FormAlliance'
  | 'actions.label.Bribe'
  | 'actions.label.SuppressCrime'
  | 'actions.description.InvestInTech'
  | 'actions.description.RecruitArmy'
  | 'actions.description.MoveArmy'
  | 'actions.description.CollectTaxes'
  | 'actions.description.PassLaw'
  | 'actions.description.Spy'
  | 'actions.description.DiplomacyOffer'
  | 'actions.description.DeclareWar'
  | 'actions.description.FormAlliance'
  | 'actions.description.Bribe'
  | 'actions.description.SuppressCrime'
  | 'settings.theme.light'
  | 'settings.theme.dark'
  | 'settings.colorblind.standard'
  | 'settings.colorblind.deuteranopia'
  | 'settings.colorblind.protanopia'
  | 'settings.colorblind.tritanopia'
  | 'help.title'
  | 'help.shortcuts'
  | 'help.close'
  | 'hotkeys.openMenu'
  | 'hotkeys.toggleMap'
  | 'hotkeys.endTurn'
  | 'hotkeys.quickSave'
  | 'hotkeys.openEconomy'
  | 'audio.nowPlaying'
  | 'audio.track.ancientEchoes'
  | 'map.unclaimed'
  | 'map.garrison'
  | 'map.development'
  | 'language.en'
  | 'language.sv'

export type TranslationDictionary = Record<TranslationKey, string>

export const translations: Record<LocaleKey, TranslationDictionary> = {
  en: {
    'app.title': 'Ancient War Command',
    'app.save': 'Save',
    'app.load': 'Load',
    'app.endTurn': 'End Turn',
    'app.toggleMap': 'Toggle Map',
    'app.quickSave': 'Quick Save',
    'app.actionsRemaining': 'Actions Remaining',
    'app.turn': 'Turn',
    'app.treasury': 'Treasury',
    'app.map.political': 'Political',
    'app.map.stability': 'Stability',
    'app.map.strategic': 'Strategic Map',
    'hud.actions': 'Actions',
    'hud.stability': 'Stability',
    'hud.research': 'Research',
    'hud.influence': 'Influence',
    'hud.population': 'Population',
    'hud.overview': 'Overview',
    'hud.actionsLeft': 'Actions left',
    'nationSelect.heading': 'Choose Your Nation',
    'nationSelect.choose': 'Select',
    'nationSelect.title': 'Choose Your Civilization',
    'nationSelect.subtitle': 'Select a legendary nation to guide through intrigue, warfare, and diplomacy.',
    'nationSelect.territories': 'Territories',
    'nationSelect.stabilityLabel': 'Stability',
    'nationSelect.advantages': 'Advantages',
    'nationSelect.disadvantages': 'Disadvantages',
    'actionMenu.title': 'Command Actions',
    'actionMenu.remaining': 'Remaining',
    'actionModal.confirm': 'Confirm',
    'actionModal.cancel': 'Cancel',
    'actions.sourceTerritory': 'Source Territory',
    'actions.targetTerritory': 'Target Territory',
    'actions.targetNation': 'Target Nation',
    'actions.selectTerritory': 'Select territory',
    'actions.selectTarget': 'Select target',
    'actions.chooseNation': 'Choose nation',
    'actions.ownership.friendly': 'Friendly',
    'actions.ownership.enemy': 'Enemy',
    'diplomacy.title': 'Diplomacy Ledger',
    'diplomacy.relationships': 'Relationships',
    'diplomacy.status.war': 'War',
    'diplomacy.status.alliance': 'Alliance',
    'eventLog.title': 'Event Log',
    'eventLog.empty': 'No events recorded yet.',
    'notifications.autosave': 'Game autosaved.',
    'notifications.quicksave': 'Quick save complete.',
    'notifications.manualsave': 'Game saved.',
    'settings.theme': 'Theme',
    'settings.colorblind': 'Color Palette',
    'settings.language': 'Language',
    'settings.tooltips': 'Tooltips',
    'settings.tooltips.basic': 'Essential',
    'settings.tooltips.deep': 'Detailed',
    'settings.hotkeys': 'Hotkeys',
    'settings.hotkey.rebind': 'Rebind',
    'settings.hotkey.press': 'Press a key…',
    'settings.audio': 'Audio',
    'settings.audio.mute': 'Mute',
    'settings.audio.unmute': 'Unmute',
    'settings.audio.volume': 'Volume',
    'economy.title': 'Economy & Trade',
    'economy.tradeRoutes': 'Trade Routes',
    'economy.income': 'Income',
    'economy.expenses': 'Expenses',
    'economy.trade.agreements': 'Trade Agreements',
    'economy.trade.maritime': 'Maritime',
    'economy.trade.land': 'Land',
    'court.title': 'Court & Intrigue',
    'court.factions': 'Court Factions',
    'court.influence': 'Influence',
    'court.risks': 'Risks',
    'tech.title': 'Tech Tree',
    'tech.progress': 'Research Progress',
    'tech.completed': 'Completed Discoveries',
    'missions.title': 'Missions & Objectives',
    'missions.active': 'Active',
    'missions.completed': 'Completed',
    'overlays.title': 'Overlays',
    'overlays.select': 'Select overlay',
    'minimap.title': 'Minimap',
    'achievements.title': 'Achievements',
    'achievements.locked': 'Locked',
    'achievements.unlocked': 'Unlocked',
    'achievements.entry.first-blood': 'First Blood',
    'achievements.entry.strategist': 'Grand Strategist',
    'achievements.entry.master-diplomat': 'Master Diplomat',
    'codex.title': 'War Codex',
    'codex.searchPlaceholder': 'Search entries…',
    'codex.back': 'Back',
    'codex.section.economy': 'Economy',
    'codex.section.military': 'Military',
    'codex.section.politics': 'Politics',
    'codex.section.technology': 'Technology',
    'codex.section.diplomacy': 'Diplomacy',
    'codex.entry.tradeEfficiency.title': 'Trade Efficiency',
    'codex.entry.tradeEfficiency.body':
      'Improve stability and reduce corruption to unlock lucrative caravans and maritime trade routes.',
    'codex.entry.armyComposition.title': 'Army Composition',
    'codex.entry.armyComposition.body':
      'Balanced forces with combined arms tactics have higher survival and inflict fewer casualties on friendly regions.',
    'codex.entry.senateSupport.title': 'Senate Support',
    'codex.entry.senateSupport.body':
      'Keep influential factions appeased to avoid costly civil unrest and maintain high stability ratings.',
    'codex.entry.researchPriorities.title': 'Research Priorities',
    'codex.entry.researchPriorities.body':
      'Focus research on engineering early to unlock infrastructure bonuses before pivoting to civics.',
    'codex.entry.allianceWeb.title': 'Alliance Web',
    'codex.entry.allianceWeb.body':
      'Chain alliances carefully to avoid entanglements that drag your empire into unwanted wars.',
    'screenshot.title': 'Screenshot Export',
    'screenshot.capture': 'Capture',
    'performance.title': 'Performance',
    'performance.fps': 'FPS',
    'performance.turnTime': 'Turn Time',
    'performance.lastSave': 'Last Save',
    'confirm.quit': 'Unsaved progress will be lost. Exit anyway?',
    'autosave.prompt': 'Autosaving…',
    'quicksave.prompt': 'Quick saving…',
    'overlays.map.political': 'Political',
    'overlays.map.stability': 'Stability',
    'overlays.map.economic': 'Economic',
    'missions.none': 'No active missions.',
    'tech.none': 'No research underway.',
    'economy.noRoutes': 'No trade routes established.',
    'court.noFactions': 'No notable factions yet.',
    'achievements.none': 'No achievements yet.',
    'stats.stability': 'Stability',
    'stats.military': 'Military',
    'stats.tech': 'Technology',
    'stats.economy': 'Economy',
    'stats.crime': 'Crime',
    'stats.influence': 'Influence',
    'stats.support': 'Support',
    'stats.science': 'Science',
    'stats.laws': 'Laws',
    'actions.label.InvestInTech': 'Invest in Technology',
    'actions.label.RecruitArmy': 'Recruit Army',
    'actions.label.MoveArmy': 'Move Army',
    'actions.label.CollectTaxes': 'Collect Taxes',
    'actions.label.PassLaw': 'Pass Law',
    'actions.label.Spy': 'Conduct Espionage',
    'actions.label.DiplomacyOffer': 'Diplomacy Offer',
    'actions.label.DeclareWar': 'Declare War',
    'actions.label.FormAlliance': 'Form Alliance',
    'actions.label.Bribe': 'Bribe Officials',
    'actions.label.SuppressCrime': 'Suppress Crime',
    'actions.description.InvestInTech': 'Spend coin to gain technology and science.',
    'actions.description.RecruitArmy': 'Raise fresh troops within a controlled territory.',
    'actions.description.MoveArmy': 'Redeploy armies or assault a neighboring region.',
    'actions.description.CollectTaxes': 'Extract revenues and risk growing unrest.',
    'actions.description.PassLaw': 'Stabilise society through new legislation.',
    'actions.description.Spy': 'Disrupt an opponent with covert agents.',
    'actions.description.DiplomacyOffer': 'Improve relations via gifts and emissaries.',
    'actions.description.DeclareWar': 'Begin open conflict with a rival state.',
    'actions.description.FormAlliance': 'Bind another nation in mutual defense.',
    'actions.description.Bribe': 'Influence leaders through clandestine payments.',
    'actions.description.SuppressCrime': 'Deploy forces internally to lower crime.',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.colorblind.standard': 'Standard',
    'settings.colorblind.deuteranopia': 'Deuteranopia',
    'settings.colorblind.protanopia': 'Protanopia',
    'settings.colorblind.tritanopia': 'Tritanopia',
    'help.title': 'Command Help',
    'help.shortcuts': 'Shortcuts',
    'help.close': 'Close',
    'hotkeys.openMenu': 'Open Action Menu',
    'hotkeys.toggleMap': 'Toggle Map Mode',
    'hotkeys.endTurn': 'End Turn',
    'hotkeys.quickSave': 'Quick Save',
    'hotkeys.openEconomy': 'Focus Economy Panel',
    'audio.nowPlaying': 'Now playing',
    'audio.track.ancientEchoes': 'Ancient Echoes',
    'map.unclaimed': 'Unclaimed',
    'map.garrison': 'Garrison',
    'map.development': 'Dev',
    'language.en': 'English',
    'language.sv': 'Svenska',
  },
  'sv-SE': {
    'app.title': 'Ancient War Command',
    'app.save': 'Spara',
    'app.load': 'Ladda',
    'app.endTurn': 'Avsluta rundan',
    'app.toggleMap': 'Växla karta',
    'app.quickSave': 'Snabbspara',
    'app.actionsRemaining': 'Åtgärder kvar',
    'app.turn': 'Runda',
    'app.treasury': 'Statsskatt',
    'app.map.political': 'Politisk',
    'app.map.stability': 'Stabilitet',
    'app.map.strategic': 'Strategisk karta',
    'hud.actions': 'Åtgärder',
    'hud.stability': 'Stabilitet',
    'hud.research': 'Forskning',
    'hud.influence': 'Inflytande',
    'hud.population': 'Befolkning',
    'hud.overview': 'Översikt',
    'hud.actionsLeft': 'Åtgärder kvar',
    'nationSelect.heading': 'Välj din nation',
    'nationSelect.choose': 'Välj',
    'nationSelect.title': 'Välj din civilisation',
    'nationSelect.subtitle': 'Välj en legendarisk nation att leda genom intriger, krig och diplomati.',
    'nationSelect.territories': 'Territorier',
    'nationSelect.stabilityLabel': 'Stabilitet',
    'nationSelect.advantages': 'Fördelar',
    'nationSelect.disadvantages': 'Nackdelar',
    'actionMenu.title': 'Kommandoåtgärder',
    'actionMenu.remaining': 'Kvar',
    'actionModal.confirm': 'Bekräfta',
    'actionModal.cancel': 'Avbryt',
    'actions.sourceTerritory': 'Källt territorium',
    'actions.targetTerritory': 'Målterritorium',
    'actions.targetNation': 'Målnation',
    'actions.selectTerritory': 'Välj territorium',
    'actions.selectTarget': 'Välj mål',
    'actions.chooseNation': 'Välj nation',
    'actions.ownership.friendly': 'Vänlig',
    'actions.ownership.enemy': 'Fientlig',
    'diplomacy.title': 'Diplomatisk bok',
    'diplomacy.relationships': 'Relationer',
    'diplomacy.status.war': 'Krig',
    'diplomacy.status.alliance': 'Allians',
    'eventLog.title': 'Händelselogg',
    'eventLog.empty': 'Inga händelser registrerade ännu.',
    'notifications.autosave': 'Spelet autosparat.',
    'notifications.quicksave': 'Snabbsparning klar.',
    'notifications.manualsave': 'Spelet sparat.',
    'settings.theme': 'Tema',
    'settings.colorblind': 'Färgpalett',
    'settings.language': 'Språk',
    'settings.tooltips': 'Verktygstips',
    'settings.tooltips.basic': 'Grundläggande',
    'settings.tooltips.deep': 'Fördjupade',
    'settings.hotkeys': 'Snabbtangenter',
    'settings.hotkey.rebind': 'Ändra',
    'settings.hotkey.press': 'Tryck på en tangent…',
    'settings.audio': 'Ljud',
    'settings.audio.mute': 'Tysta',
    'settings.audio.unmute': 'Ljud på',
    'settings.audio.volume': 'Volym',
    'economy.title': 'Ekonomi & Handel',
    'economy.tradeRoutes': 'Handelsrutter',
    'economy.income': 'Inkomster',
    'economy.expenses': 'Utgifter',
    'economy.trade.agreements': 'Handelsavtal',
    'economy.trade.maritime': 'Maritim',
    'economy.trade.land': 'Landbaserad',
    'court.title': 'Hov & Intriger',
    'court.factions': 'Hovfraktioner',
    'court.influence': 'Inflytande',
    'court.risks': 'Risker',
    'tech.title': 'Teknikträd',
    'tech.progress': 'Forskningsframsteg',
    'tech.completed': 'Färdiga upptäckter',
    'missions.title': 'Uppdrag & mål',
    'missions.active': 'Aktiva',
    'missions.completed': 'Avklarade',
    'overlays.title': 'Överlägg',
    'overlays.select': 'Välj överlägg',
    'minimap.title': 'Minikarta',
    'achievements.title': 'Prestationer',
    'achievements.locked': 'Låst',
    'achievements.unlocked': 'Upplåst',
    'achievements.entry.first-blood': 'Första blod',
    'achievements.entry.strategist': 'Stor strateg',
    'achievements.entry.master-diplomat': 'Mästerdiplomat',
    'codex.title': 'Krigskodex',
    'codex.searchPlaceholder': 'Sök poster…',
    'codex.back': 'Tillbaka',
    'codex.section.economy': 'Ekonomi',
    'codex.section.military': 'Militär',
    'codex.section.politics': 'Politik',
    'codex.section.technology': 'Teknologi',
    'codex.section.diplomacy': 'Diplomati',
    'codex.entry.tradeEfficiency.title': 'Handelseffektivitet',
    'codex.entry.tradeEfficiency.body':
      'Förbättra stabiliteten och minska korruptionen för att öppna lönsamma karavaner och sjöhandelsrutter.',
    'codex.entry.armyComposition.title': 'Armésammansättning',
    'codex.entry.armyComposition.body':
      'Balanserade styrkor med kombinerade vapen överlever längre och minskar förluster i egna provinser.',
    'codex.entry.senateSupport.title': 'Senatens stöd',
    'codex.entry.senateSupport.body':
      'Håll inflytelserika fraktioner nöjda för att undvika dyrt uppror och behålla hög stabilitet.',
    'codex.entry.researchPriorities.title': 'Forskningsprioriteringar',
    'codex.entry.researchPriorities.body':
      'Fokusera forskningen på ingenjörskonst tidigt för att låsa upp infrastrukturbonusar innan du växlar till civila reformer.',
    'codex.entry.allianceWeb.title': 'Alliansnätverk',
    'codex.entry.allianceWeb.body':
      'Knyt allianser varsamt för att undvika förvecklingar som drar riket in i oönskade krig.',
    'screenshot.title': 'Skärmdumpsexport',
    'screenshot.capture': 'Fånga',
    'performance.title': 'Prestanda',
    'performance.fps': 'FPS',
    'performance.turnTime': 'Rundtid',
    'performance.lastSave': 'Senaste sparning',
    'confirm.quit': 'Osparad framsteg går förlorad. Avsluta ändå?',
    'autosave.prompt': 'Autosparar…',
    'quicksave.prompt': 'Snabbsparar…',
    'overlays.map.political': 'Politisk',
    'overlays.map.stability': 'Stabilitet',
    'overlays.map.economic': 'Ekonomisk',
    'missions.none': 'Inga aktiva uppdrag.',
    'tech.none': 'Ingen forskning pågår.',
    'economy.noRoutes': 'Inga handelsrutter etablerade.',
    'court.noFactions': 'Inga nämnvärda fraktioner ännu.',
    'achievements.none': 'Inga prestationer ännu.',
    'stats.stability': 'Stabilitet',
    'stats.military': 'Militär',
    'stats.tech': 'Teknologi',
    'stats.economy': 'Ekonomi',
    'stats.crime': 'Brottslighet',
    'stats.influence': 'Inflytande',
    'stats.support': 'Stöd',
    'stats.science': 'Vetenskap',
    'stats.laws': 'Lagar',
    'actions.label.InvestInTech': 'Investera i teknologi',
    'actions.label.RecruitArmy': 'Rekrytera armé',
    'actions.label.MoveArmy': 'Förflytta armé',
    'actions.label.CollectTaxes': 'Ta upp skatter',
    'actions.label.PassLaw': 'Stifta lag',
    'actions.label.Spy': 'Bedriv spionage',
    'actions.label.DiplomacyOffer': 'Diplomatisk gest',
    'actions.label.DeclareWar': 'Förklara krig',
    'actions.label.FormAlliance': 'Forma allians',
    'actions.label.Bribe': 'Mutor',
    'actions.label.SuppressCrime': 'Bekämpa brott',
    'actions.description.InvestInTech': 'Spendera mynt för att öka teknologi och vetenskap.',
    'actions.description.RecruitArmy': 'Värva trupper i ett kontrollerat territorium.',
    'actions.description.MoveArmy': 'Omplacera arméer eller angrip grannar.',
    'actions.description.CollectTaxes': 'Samla in inkomster men riskera oro.',
    'actions.description.PassLaw': 'Stabilisera samhället med ny lagstiftning.',
    'actions.description.Spy': 'Stör en rival med hemliga agenter.',
    'actions.description.DiplomacyOffer': 'Förbättra relationer genom gåvor och sändebud.',
    'actions.description.DeclareWar': 'Inled öppen konflikt mot en rival.',
    'actions.description.FormAlliance': 'Slut försvarspakt och stärk relationer.',
    'actions.description.Bribe': 'Påverka ledare genom hemliga betalningar.',
    'actions.description.SuppressCrime': 'Sätt in styrkor internt för att minska brott.',
    'settings.theme.light': 'Ljust',
    'settings.theme.dark': 'Mörkt',
    'settings.colorblind.standard': 'Standard',
    'settings.colorblind.deuteranopia': 'Deuteranopi',
    'settings.colorblind.protanopia': 'Protanopi',
    'settings.colorblind.tritanopia': 'Tritanopi',
    'help.title': 'Kommandohjälp',
    'help.shortcuts': 'Genvägar',
    'help.close': 'Stäng',
    'hotkeys.openMenu': 'Öppna åtgärdsmeny',
    'hotkeys.toggleMap': 'Växla kartläge',
    'hotkeys.endTurn': 'Avsluta rundan',
    'hotkeys.quickSave': 'Snabbspara',
    'hotkeys.openEconomy': 'Fokusera ekonomipanel',
    'audio.nowPlaying': 'Spelar nu',
    'audio.track.ancientEchoes': 'Forntida ekon',
    'map.unclaimed': 'Ingen ägare',
    'map.garrison': 'Garnison',
    'map.development': 'Utv',
    'language.en': 'Engelska',
    'language.sv': 'Svenska',
  },
}

export const fallbackLocale: LocaleKey = 'en'
