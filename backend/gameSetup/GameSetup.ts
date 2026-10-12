import type { GameState, PublicGameState, PrivateGameState, PublicPlayerState, PrivatePlayerState } from "../state/GameState.js";
import type { LocationID, PublicLocationState, PublicColonyState } from "../state/Location.js";
import type { ItemID, SurvivorID, ItemCardInfo } from "../state/Card.js";
import type { SurvivorInfo } from "../state/Survivor.js";

// Đọc dữ liệu item và survivor mẫu từ mô tả GameSetup.ts và data/json
export const SURVIVOR_CATALOG: Record<SurvivorID, SurvivorInfo> = {
    forest_plum: {
        id: "forest_plum",
        name: "Forest Plum",
        job: "Mall Santa",
        hp: 3,
        influent: 47,
        searchIndex: 3,
        powerIndex: 4,
        skillDescription: "When Forest searches the Grocery Store, you may look at 2 additional cards. (Or remove at turn start for +1 morale)",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    ashley_ross: {
        id: "ashley_ross",
        name: "Ashley Ross",
        job: "Constructor Worker",
        hp: 3,
        influent: 52,
        searchIndex: 5,
        powerIndex: 2,
        skillDescription: "Once per turn, you can build 1 barricade without throwing any dice.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    mike_cho: {
        id: "mike_cho",
        name: "Mike Cho",
        job: "Ninja",
        hp: 3,
        influent: 30,
        searchIndex: 4,
        powerIndex: 2,
        skillDescription: "Do not roll exposure dice when attacking.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: ['NO_EXPOSURE_WHEN_ATTACK'] }
    },
    sparky: {
        id: "sparky",
        name: "Sparky",
        job: "Stunt Dog",
        hp: 3,
        influent: 2,
        searchIndex: 4,
        powerIndex: 2,
        skillDescription: "Ignore bite spread. When getting bite, place 1 wound instead. Does not roll exposure when moving or attacking.",
        skill: {
            condition: [],
            cost: [],
            activeEffect: [],
            passiveEffect: [
                'IGNORE_BITE_SPREADING',
                'CHANGE_BITE_TO_WOUND',
                'NO_EXPOSURE_WHEN_ATTACK',
                'NO_EXPOSURE_WHEN_MOVING'
            ]
        }
    },
    loretta_clay: {
        id: "loretta_clay",
        name: "Loretta Clay",
        job: "Cook",
        hp: 3,
        influent: 22,
        searchIndex: 5,
        powerIndex: 4,
        skillDescription: "Colony: Once per turn, you can spend 1 dice 4+ to add 2 food to colony.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    officer_grey: {
        id: "officer_grey",
        name: "Grey",
        job: "Police Officer",
        hp: 3,
        influent: 58,
        searchIndex: 4,
        powerIndex: 1,
        skillDescription: "Once per round, you may kill 1 zombie at Grey's location without spending an action die.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    }
};

export const ITEM_CATALOG: Record<ItemID, ItemCardInfo> = {
    starter_food: {
        id: "starter_food",
        name: "Food",
        location: "starterItem",
        symbol: "food",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Add 1 food token to the colony food supply.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    starter_medicine: {
        id: "starter_medicine",
        name: "Medicine",
        location: "starterItem",
        symbol: "medicine",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Remove 1 wound of any type from a survivor you control.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    starter_junk: {
        id: "starter_junk",
        name: "Junk",
        location: "starterItem",
        symbol: "tool",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Reroll 1 of your unused action dice.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    starter_fuel: {
        id: "starter_fuel",
        name: "Fuel",
        location: "starterItem",
        symbol: "fuel",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Play when moving a survivor. Do not roll exposure die.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    police_pistol: {
        id: "police_pistol",
        name: "Pistol",
        location: "policeStation",
        symbol: "weapon",
        isEquip: true,
        afterUsedLocation: "waste",
        skillDescription: "Equip: Spend 1 action die to kill 1 zombie at location without exposure.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    police_shotgun: {
        id: "police_shotgun",
        name: "Shotgun",
        location: "policeStation",
        symbol: "weapon",
        isEquip: true,
        afterUsedLocation: "waste",
        skillDescription: "Equip: Spend 1 action die to kill up to 2 zombies without exposure.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    hospital_adrenaline: {
        id: "hospital_adrenaline",
        name: "Adrenaline",
        location: "hospital",
        symbol: "medicine",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Change 1 unused action dice to any value.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    gas_lighter: {
        id: "gas_lighter",
        name: "Lighter",
        location: "gasStation",
        symbol: "tool",
        isEquip: true,
        afterUsedLocation: "waste",
        skillDescription: "Equip: Discard 1 fuel card to remove up to 4 zombies.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    school_one_outsider: {
        id: "school_one_outsider",
        name: "One-outsider",
        location: "school",
        symbol: "outside",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Add 1 survivor to colony.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    },
    library_two_outsider: {
        id: "library_two_outsider",
        name: "Two-outsider",
        location: "library",
        symbol: "outside",
        isEquip: false,
        afterUsedLocation: "waste",
        skillDescription: "Add 1 survivor and 1 helpless survivor.",
        skill: { condition: [], cost: [], activeEffect: [], passiveEffect: [] }
    }
};

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i]!;
        arr[i] = arr[j]!;
        arr[j] = temp;
    }
    return arr;
}

export function setupInitialGame(numPlayers: number = 1): GameState {
    const playerIDs = Array.from({ length: numPlayers }, (_, i) => i.toString());

    // 1. Tạo starter item deck (32 lá: 8 food, 8 medicine, 8 junk, 8 fuel)
    const starterItems: ItemID[] = [];
    for (let i = 1; i <= 8; i++) {
        starterItems.push(`starter_food_${i}`);
        starterItems.push(`starter_medicine_${i}`);
        starterItems.push(`starter_junk_${i}`);
        starterItems.push(`starter_fuel_${i}`);
    }
    const shuffledStarter = shuffleArray(starterItems);

    // 2. Tạo Location item decks (mỗi địa điểm ~20 lá theo ghi chú)
    const LOCATIONS: LocationID[] = ['gasStation', 'hospital', 'library', 'school', 'groceryStore', 'policeStation'];
    const locationDecks: Record<LocationID, { cards: ItemID[]; reveal: ItemID[] }> = {} as any;

    LOCATIONS.forEach(loc => {
        const cards: ItemID[] = [];
        // Thêm một số card đặc trưng theo location
        if (loc === 'policeStation') {
            cards.push('police_pistol_1', 'police_pistol_2', 'police_shotgun_1');
        } else if (loc === 'hospital') {
            cards.push('hospital_adrenaline_1', 'hospital_adrenaline_2');
        } else if (loc === 'gasStation') {
            cards.push('gas_lighter_1');
        } else if (loc === 'school') {
            cards.push('school_one_outsider_1');
        } else if (loc === 'library') {
            cards.push('library_two_outsider_1');
        }
        let count = cards.length;
        while (count < 20) {
            cards.push(`${loc}_item_${count + 1}`);
            count++;
        }
        locationDecks[loc] = {
            cards: shuffleArray(cards),
            reveal: []
        };
    });

    // 3. Survivor deck: Danh sách 6 survivor mẫu
    const allSurvivorIds: SurvivorID[] = Object.keys(SURVIVOR_CATALOG);
    const shuffledSurvivors = shuffleArray(allSurvivorIds);

    // 4. Khởi tạo player state & chia bài
    const playersPublic: Record<string, PublicPlayerState> = {};
    const playersPrivate: Record<string, PrivatePlayerState> = {};
    const survivorInfo: GameState['public']['survivorInfo'] = {};

    playerIDs.forEach((pId) => {
        // Rút 2 survivor cho mỗi người chơi
        const mySurvivors = shuffledSurvivors.splice(0, 2);

        // Mỗi người chơi bắt đầu với 5 starter items
        const myHand = shuffledStarter.splice(0, 5);

        // Mỗi survivor khởi đầu ở Colony
        mySurvivors.forEach(sId => {
            survivorInfo[sId] = {
                location: 'colony',
                belongPlayer: pId,
                wound: [],
                hasMoved: false,
                equippedItems: []
            };
        });

        // 1 xúc xắc cơ bản + 1 cho mỗi survivor = 3 xúc xắc
        playersPublic[pId] = {
            playerName: `Player ${pId}`,
            survivorList: mySurvivors,
            handSize: myHand.length,
            isExiled: false,
            groupLeader: mySurvivors[0] ?? null,
            die: {
                unused: [3, 4, 5],
                used: []
            }
        };

        playersPrivate[pId] = {
            hand: myHand,
            secretObjective: null,
            crossroadCardHolding: "",
            vote: null
        };
    });

    // 5. Khởi tạo trạng thái các địa điểm
    const locationState: Record<LocationID, PublicLocationState> = {
        gasStation: { id: 'gasStation', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 3 }, maxSurvivorNumber: 2, maxNoise: 4, survivorNumber: 0, noise: 0 },
        hospital: { id: 'hospital', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 4 }, maxSurvivorNumber: 4, maxNoise: 4, survivorNumber: 0, noise: 0 },
        library: { id: 'library', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 3 }, maxSurvivorNumber: 3, maxNoise: 4, survivorNumber: 0, noise: 0 },
        school: { id: 'school', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 4 }, maxSurvivorNumber: 4, maxNoise: 4, survivorNumber: 0, noise: 0 },
        groceryStore: { id: 'groceryStore', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 4 }, maxSurvivorNumber: 3, maxNoise: 4, survivorNumber: 0, noise: 0 },
        policeStation: { id: 'policeStation', entrance: { zombie: 0, barricade: 0, maxZombieCapacity: 4 }, maxSurvivorNumber: 3, maxNoise: 4, survivorNumber: 0, noise: 0 },
    };

    // 6. Colony: 6 entrances, mỗi cổng max 3 zombie
    const colonyEntrances = Array.from({ length: 6 }, () => ({
        zombie: 0,
        barricade: 0,
        maxZombieCapacity: 3
    }));

    const totalColonySurvivors = Object.values(survivorInfo).filter(s => s.location === 'colony').length;

    const colonyState: PublicColonyState = {
        entrances: colonyEntrances,
        maxEntrance: 6,
        maxSurvivor: 24,
        survivor: totalColonySurvivors,
        helpless: 0,
        food: 2,
        starvation: 0,
        waste: []
    };

    const firstPlayerId = playerIDs[0] || "0";

    const publicState: PublicGameState = {
        gameMode: 'co-op',
        players: playersPublic,
        playerOrder: playerIDs,
        currentPlayerID: firstPlayerId,
        phase: 'playerPhase',
        gameStatus: 'on-going',
        leftRound: 6,
        morale: 8,
        mainObjective: null,
        currentCrisis: null,
        mainObjectiveItemContribution: [],
        mainObjectiveToken: 0,
        location: locationState,
        colony: colonyState,
        survivorInfo,
        pending: null,
        removeSurvivor: [],
        removeItemCard: [],
        previousLog: {
            player: firstPlayerId,
            playerName: "System",
            reason: "Init",
            description: "Game setup initialized successfully."
        }
    };

    const privateState: PrivateGameState = {
        id: firstPlayerId,
        survivorDeck: { cards: shuffledSurvivors, reveal: [] },
        crisisDeck: { cards: ["crisis_food_shortage", "crisis_fuel_leak", "crisis_zombie_surge"], reveal: [] },
        crossroadDeck: { cards: ["crossroad_1", "crossroad_2"], reveal: [] },
        mainObjectiveDeck: { cards: ["objective_survive"], reveal: [] },
        secretObjective: { cards: [], reveal: [] },
        exileObjective: { cards: [], reveal: [] },
        starterItemDeck: { cards: shuffledStarter, reveal: [] },
        location: locationDecks,
        players: playersPrivate,
        crisisContribution: { cards: [], reveal: [] }
    };

    return {
        public: publicState,
        private: privateState
    };
}