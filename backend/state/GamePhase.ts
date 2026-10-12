import type { MoveFunction } from "../gameLogic/Action.js";
import type { PlayerID } from "boardgame.io";
import type { ItemID, SurvivorID } from "./Card.js";
import type { LocationID } from "./Location.js";

/**
 * 4 trạng thái phase cơ bản theo luật Dead of Winter
 */
export type GamePhaseType = 'beforeGameStart' | 'startRound' | 'playerPhase' | 'colonyPhase';

/**
 * Interface GamePhase định nghĩa tất cả các hành động liên quan trực tiếp đến 4 phase của game:
 * 1. beforeGameStart (Giai đoạn chuẩn bị/setup bàn chơi & nhân vật)
 * 2. startRound (Đầu vòng: lật crisis, đổ xí ngầu theo số survivor)
 * 3. playerPhase (Lượt của người chơi: giải quyết frostbite đầu lượt, các hành động trong lượt)
 * 4. colonyPhase (Giai đoạn khu định cư: trả food/starvation, check waste, resolve crisis, thêm zombie, check mục tiêu, giảm round, pass first player)
 */
export interface GamePhase {
     // --- 1. Phase: beforeGameStart ---
     /**
      * Người chơi chọn 2 survivor giữ lại từ 4 survivor được chia, trả phần còn lại vào survivor deck
      */
     chooseStartingSurvivors: MoveFunction<[playerId: PlayerID, keepSurvivorIds: [SurvivorID, SurvivorID]]>;

     /**
      * Người chơi chọn 1 survivor trong nhóm làm Group Leader
      */
     chooseGroupLeader: MoveFunction<[playerId: PlayerID, leaderSurvivorId: SurvivorID]>;

     /**
      * Bắt đầu trận đấu: Chuyển phase từ beforeGameStart sang startRound (hoặc chỉ định người chơi có leader influence cao nhất làm First Player)
      */
     startGame: MoveFunction<[]>;


     // --- 2. Phase: startRound ---
     /**
      * Lật lá bài Crisis đầu tiên từ crisis deck cho vòng chơi mới
      */
     revealCrisis: MoveFunction<[]>;

     /**
      * Đổ toàn bộ xúc xắc hành động cho tất cả người chơi (mỗi người 1 xúc xắc cơ bản + 1 cho mỗi survivor điều khiển)
      */
     rollRoundActionDice: MoveFunction<[]>;

     /**
      * Chuyển từ startRound sang playerPhase
      */
     startPlayerPhase: MoveFunction<[]>;


     // --- 3. Phase: playerPhase ---
     /**
      * Bắt đầu lượt của 1 người chơi: Giải quyết sát thương Frostbite (mỗi survivor có frostbite nhận thêm 1 vết thương wound)
      */
     startPlayerTurn: MoveFunction<[playerId: PlayerID]>;

     /**
      * Kết thúc lượt của người chơi hiện tại, chuyển lượt cho người kế tiếp hoặc chuyển sang colonyPhase nếu đã hết lượt
      */
     endPlayerTurn: MoveFunction<[]>;

     /**
      * Tấn công một survivor khác (đổ lại spent die, nếu <= attack value thì gây wound và cướp ngẫu nhiên 1 lá trên tay)
      */
     attackSurvivor: MoveFunction<[attackerSurvivorId: SurvivorID, targetSurvivorId: SurvivorID, dieIndex: number]>;

     /**
      * Tìm kiếm với tiếng ồn (Search with noise): Rút thêm 1 lá từ deck địa điểm và tăng 1 noise
      */
     searchMakeNoise: MoveFunction<[survivorId: SurvivorID]>;

     /**
      * Hoàn tất tìm kiếm: Giữ lại 1 lá bài đã rút vào tay, trả toàn bộ bài thừa về đáy deck của địa điểm đó
      */
     finishSearch: MoveFunction<[survivorId: SurvivorID, keptCardId: ItemID]>;

     /**
      * Yêu cầu/xin 1 thẻ bài từ người chơi khác
      */
     requestCard: MoveFunction<[fromPlayerId: PlayerID, toPlayerId: PlayerID, cardId: ItemID]>;


     // --- 4. Phase: colonyPhase ---
     /**
      * Trả thức ăn Colony: 1 food cho mỗi 2 survivor (làm tròn lên). Nếu không đủ -> nhận 1 starvation token và giảm morale
      */
     payFood: MoveFunction<[]>;

     /**
      * Kiểm tra bãi rác Colony: Giảm 1 morale cho mỗi 10 lá bài trong waste pile
      */
     checkWaste: MoveFunction<[]>;

     /**
      * Giải quyết Khủng hoảng (Crisis Resolution): Xáo, lật bài đóng góp, tính điểm khớp/lệch, xử lý phạt nếu thất bại
      */
     resolveCrisis: MoveFunction<[]>;

     /**
      * Thêm Zombie cuối vòng: Thêm zombie vào Colony (xoay vòng 6 cổng), thêm zombie vào các địa điểm có survivor, đổ xí ngầu giải quyết noise tokens
      */
     addColonyZombies: MoveFunction<[]>;

     /**
      * Kiểm tra mục tiêu chính (Main Objective): Nếu hoàn thành thì kết thúc game
      */
     checkMainObjective: MoveFunction<[]>;

     /**
      * Giảm Round tracker đi 1 nấc (nếu về 0 thì game kết thúc)
      */
     advanceRoundTracker: MoveFunction<[]>;

     /**
      * Chuyển First Player Token sang người chơi kế tiếp và bắt đầu vòng chơi mới (chuyển về startRound)
      */
     passFirstPlayerToken: MoveFunction<[]>;
}