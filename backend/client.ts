import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { DEAD_OF_WINTER_GAME, getCardCountInDeck, getDeck } from "./gameLogic/Game.js";
import { SURVIVOR_CATALOG } from "./gameSetup/GameSetup.js";

// Trạng thái cục bộ client
let gameClient: any = null;
let currentMatchId: string = "";
let currentPlayerId: string = "0";
let currentState: any = null;
let selectedLocation: string = "colony";

const SERVER_URL = `http://${window.location.hostname || "localhost"}:8000`;

function log(message: string) {
    const logEl = document.getElementById("action-log");
    if (logEl) {
        logEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n` + (logEl.textContent || "");
    }
    console.log(`[DoW Client] ${message}`);
}

function renderUI() {
    if (!currentState) return;
    const pub = currentState.G?.public;
    const privPlayer = currentState.G?.private?.players?.[currentPlayerId] || currentState.G?.privatePlayer;
    if (!pub) return;

    // 1. Top bar stats
    const matchInfoEl = document.getElementById("info-match-id");
    const playerInfoEl = document.getElementById("info-player-id");
    const currentPlEl = document.getElementById("info-current-player");
    const phaseEl = document.getElementById("info-phase");

    const statMorale = document.getElementById("stat-morale");
    const statRound = document.getElementById("stat-round");
    const statFood = document.getElementById("stat-food");
    const statWaste = document.getElementById("stat-waste");
    const statStarvation = document.getElementById("stat-starvation");

    if (matchInfoEl) matchInfoEl.textContent = currentMatchId;
    if (playerInfoEl) playerInfoEl.textContent = currentPlayerId;
    if (currentPlEl) currentPlEl.textContent = pub.currentPlayerID || currentState.ctx.currentPlayer || "-";
    if (phaseEl) phaseEl.textContent = pub.phase || currentState.ctx.phase || "playerPhase";
    const phaseBadge = document.getElementById("badge-current-phase");
    if (phaseBadge) phaseBadge.textContent = pub.phase || currentState.ctx.phase || "playerPhase";

    if (statMorale) statMorale.textContent = pub.morale;
    if (statRound) statRound.textContent = pub.leftRound;
    if (statFood) statFood.textContent = pub.colony?.food ?? 0;
    if (statWaste) statWaste.textContent = (pub.colony?.waste?.length ?? 0).toString();
    if (statStarvation) statStarvation.textContent = pub.colony?.starvation ?? 0;

    // 2. Action dice
    const myPlayerPub = pub.players?.[currentPlayerId];
    const diceUnusedContainer = document.getElementById("dice-unused-container");
    const diceUsedContainer = document.getElementById("dice-used-container");

    if (diceUnusedContainer) {
        diceUnusedContainer.innerHTML = (myPlayerPub?.die?.unused || [])
            .map((val: number, idx: number) => `<span class="badge badge-die" title="Click để chọn index ${idx}">[${idx}]: 🎲${val}</span>`)
            .join(" ") || "<em>(Hết xúc xắc)</em>";
    }
    if (diceUsedContainer) {
        diceUsedContainer.innerHTML = (myPlayerPub?.die?.used || [])
            .map((val: number, idx: number) => `<span class="badge badge-used" title="Click để chọn index ${idx}">[${idx}]: 🎲${val}</span>`)
            .join(" ") || "<em>(Chưa có)</em>";
    }

    // 3. Hand cards
    const handCountEl = document.getElementById("hand-count");
    const handListEl = document.getElementById("hand-cards-list");
    const handCards = privPlayer?.hand || [];
    if (handCountEl) handCountEl.textContent = handCards.length.toString();
    if (handListEl) {
        handListEl.innerHTML = handCards.length > 0
            ? handCards.map((c: string) => `<div>🃏 <strong>${c}</strong></div>`).join("")
            : "<em>(Không có thẻ bài)</em>";
    }

    // 4. Controlled Survivors (Left Panel)
    const survivorsListEl = document.getElementById("survivors-list");
    const actionSelectSurvivor = document.getElementById("action-select-survivor") as HTMLSelectElement;
    const mySurvivorIds: string[] = myPlayerPub?.survivorList || [];

    if (survivorsListEl) {
        survivorsListEl.innerHTML = mySurvivorIds.map((sId: string) => {
            const sPub = pub.survivorInfo?.[sId];
            const def = SURVIVOR_CATALOG[sId] || { name: sId, influent: "-", searchIndex: "-", powerIndex: "-", skillDescription: "" };
            const woundStr = sPub?.wound?.join(", ") || "None";
            const movedBadge = sPub?.hasMoved ? `<span style="color: #dc2626; font-size: 11px;">[Moved]</span>` : `<span style="color: #059669; font-size: 11px;">[Ready]</span>`;
            return `
                <div style="border: 1px solid #ddd; padding: 6px; border-radius: 4px; font-size: 12px; background: #fafafa;">
                    <div style="font-weight: bold; color: #1e40af;">${def.name} (${sId}) ${movedBadge}</div>
                    <div>📍 Vị trí: <strong>${sPub?.location || 'colony'}</strong></div>
                    <div>⚔️ Attack: ${def.powerIndex}+ | 🔍 Search: ${def.searchIndex}+ | 👑 Influence: ${def.influent}</div>
                    <div>🩹 Wounds: <strong>${woundStr}</strong></div>
                    <div>🎒 Trang bị: ${(sPub?.equippedItems || []).join(", ") || "Trống"}</div>
                    <div style="color: #555; margin-top: 2px;"><em>${def.skillDescription}</em></div>
                </div>
            `;
        }).join("");
    }

    // Update Action Survivor dropdown
    if (actionSelectSurvivor) {
        const prevVal = actionSelectSurvivor.value;
        actionSelectSurvivor.innerHTML = mySurvivorIds.map((sId: string) => {
            const def = SURVIVOR_CATALOG[sId] || { name: sId };
            return `<option value="${sId}">${def.name} (${sId})</option>`;
        }).join("");
        if (mySurvivorIds.includes(prevVal)) {
            actionSelectSurvivor.value = prevVal;
        }
    }

    // 5. Removed Survivors list & Spawn Selector
    const removedSurvivors = pub.removeSurvivor || [];
    const removedEl = document.getElementById("removed-survivors-list");
    if (removedEl) {
        removedEl.innerHTML = removedSurvivors.length > 0
            ? removedSurvivors.map((sId: string) => `<span class="badge" style="background: #f1f5f9; color: #334155; margin-right: 4px;">${SURVIVOR_CATALOG[sId]?.name || sId}</span>`).join(" ")
            : "<em>(Không có ai)</em>";
    }

    const selectSpawnSurvivor = document.getElementById("select-spawn-survivor") as HTMLSelectElement;
    if (selectSpawnSurvivor) {
        const allPossibleSurvivors = Array.from(new Set([...removedSurvivors, ...Object.keys(SURVIVOR_CATALOG)]));
        const prevSpawnVal = selectSpawnSurvivor.value;
        selectSpawnSurvivor.innerHTML = allPossibleSurvivors.map(sId => {
            const isRemoved = removedSurvivors.includes(sId) ? " [Đã bị loại]" : "";
            return `<option value="${sId}">${SURVIVOR_CATALOG[sId]?.name || sId}${isRemoved}</option>`;
        }).join("");
        if (allPossibleSurvivors.includes(prevSpawnVal)) {
            selectSpawnSurvivor.value = prevSpawnVal;
        }
    }

    // 6. Pending Action & Triggers Banner
    renderPendingActionBanner(pub.pending);

    // 7. Middle Panel: Location View
    renderLocationDetail();
}

function renderPendingActionBanner(pending: any) {
    const banner = document.getElementById("pending-action-banner");
    const titleEl = document.getElementById("pending-title");
    const badgeEl = document.getElementById("pending-type-badge");
    const descEl = document.getElementById("pending-description");
    const container = document.getElementById("pending-controls-container");

    if (!banner || !titleEl || !badgeEl || !descEl || !container) return;

    if (!pending) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "block";
    badgeEl.textContent = pending.type;

    if (pending.type === 'biteSpread') {
        const sDef = SURVIVOR_CATALOG[pending.survivorId] || { name: pending.survivorId };
        titleEl.textContent = "⚠️ BITE INFECTION SPREADING!";
        descEl.innerHTML = `Nhân vật <b>${sDef.name} (${pending.survivorId})</b> tại <b>${pending.location}</b> đang bị đe dọa lây nhiễm! Chọn 1 trong 2 quyết định theo luật:`;
        container.innerHTML = `
            <button id="btn-pending-bite-accept" class="danger">💀 Chấp nhận Hy sinh (Dừng lây)</button>
            <button id="btn-pending-bite-risk" class="primary">🎲 Đổ Xúc xắc Mạo hiểm (Risk Roll)</button>
        `;

        document.getElementById("btn-pending-bite-accept")?.addEventListener("click", () => {
            gameClient.moves?.resolveBiteAcceptDeath?.();
            log(`[Pending] Chấp nhận hy sinh ${pending.survivorId} để dừng lây nhiễm bite.`);
        });

        document.getElementById("btn-pending-bite-risk")?.addEventListener("click", () => {
            gameClient.moves?.resolveBiteRollRisk?.();
            log(`[Pending] Đổ xúc xắc exposure mạo hiểm cho ${pending.survivorId}!`);
        });
    } else if (pending.type === 'drawFromReveal') {
        titleEl.textContent = "🔍 SEARCHING: DECISION REQUIRED";
        const cards: string[] = pending.card || [];
        descEl.innerHTML = `Đang tìm kiếm tại <b>${pending.location}</b>. Bài đã lật: [${cards.map((c: string) => `<b>${c}</b>`).join(', ')}]. Chọn giữ 1 lá hoặc tạo tiếng ồn (+Noise) để lật tiếp:`;
        container.innerHTML = `
            <button id="btn-pending-noise" class="primary">+1 Noise (Lật thêm bài)</button>
            <select id="select-pending-keep-card" style="min-width: 160px;">
                ${cards.map((c: string) => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <button id="btn-pending-finish-search" class="success">Giữ lá chọn & Kết thúc</button>
        `;

        document.getElementById("btn-pending-noise")?.addEventListener("click", () => {
            gameClient.moves?.searchMakeNoise?.(pending.survivorId);
            log(`[Pending] Tạo thêm tiếng ồn để lật thêm bài tại ${pending.location}`);
        });

        document.getElementById("btn-pending-finish-search")?.addEventListener("click", () => {
            const selectEl = document.getElementById("select-pending-keep-card") as HTMLSelectElement;
            const kept = selectEl?.value;
            if (kept) {
                gameClient.moves?.finishSearch?.(pending.survivorId, kept);
                log(`[Pending] Hoàn tất tìm kiếm, giữ lại lá ${kept} vào tay.`);
            }
        });
    } else if (pending.type === 'vote') {
        titleEl.textContent = "🗳️ BIỂU QUYẾT (VOTE IN PROGRESS)";
        descEl.innerHTML = `Vấn đề biểu quyết: <b>${pending.issue || 'Vote'}</b>. Tất cả người chơi bỏ phiếu:`;
        container.innerHTML = `
            <button id="btn-pending-vote-yes" class="success">👍 YES (Đồng ý)</button>
            <button id="btn-pending-vote-no" class="danger">👎 NO (Bác bỏ)</button>
            <button id="btn-pending-vote-cancel">Hủy biểu quyết</button>
        `;

        document.getElementById("btn-pending-vote-yes")?.addEventListener("click", () => {
            gameClient.moves?.castVote?.('yes');
            log(`[Vote] Player ${currentPlayerId} voted YES`);
        });

        document.getElementById("btn-pending-vote-no")?.addEventListener("click", () => {
            gameClient.moves?.castVote?.('no');
            log(`[Vote] Player ${currentPlayerId} voted NO`);
        });

        document.getElementById("btn-pending-vote-cancel")?.addEventListener("click", () => {
            gameClient.moves?.cancelVote?.();
            log(`[Vote] Canceled vote`);
        });
    } else if (pending.type === 'resolveTriggerEffect') {
        titleEl.textContent = "⚡ HIỆU ỨNG SỰ KIỆN (TRIGGER EFFECT)";
        descEl.innerHTML = `Mô tả hiệu ứng: <b>${pending.effectDescription || 'Sự kiện kích hoạt'}</b>`;
        container.innerHTML = `
            <button id="btn-pending-opt1" class="primary">Lựa chọn 1</button>
            <button id="btn-pending-opt2" class="secondary">Lựa chọn 2</button>
        `;

        document.getElementById("btn-pending-opt1")?.addEventListener("click", () => {
            gameClient.moves?.resolveTriggerEffect?.("Option 1");
            log(`[Trigger] Selected Option 1`);
        });

        document.getElementById("btn-pending-opt2")?.addEventListener("click", () => {
            gameClient.moves?.resolveTriggerEffect?.("Option 2");
            log(`[Trigger] Selected Option 2`);
        });
    } else {
        titleEl.textContent = "ℹ️ PENDING ACTION";
        descEl.innerHTML = JSON.stringify(pending);
        container.innerHTML = `<button id="btn-pending-clear">Clear Pending</button>`;
        document.getElementById("btn-pending-clear")?.addEventListener("click", () => {
            gameClient.moves?.clearPendingAction?.();
        });
    }
}

function renderLocationDetail() {
    if (!currentState) return;
    const pub = currentState.G?.public;
    const container = document.getElementById("location-detail-container");
    if (!container || !pub) return;

    if (selectedLocation === "colony") {
        const colony = pub.colony;
        const survivorsAtColony = Object.entries(pub.survivorInfo || {})
            .filter(([_, info]: any) => info.location === "colony")
            .map(([id, _]) => SURVIVOR_CATALOG[id]?.name || id);

        container.innerHTML = `
            <div style="font-size: 14px;">
                <h4 style="color: #1e3a8a;">🏠 Colony (Khu định cư)</h4>
                <div class="row">
                    <span>Sức chứa: <strong>${colony.survivor + colony.helpless}/${colony.maxSurvivor}</strong> (Survivors: ${colony.survivor}, Helpless: ${colony.helpless})</span>
                </div>
                <div style="margin: 8px 0;">
                    <strong>Danh sách Survivors có mặt (${survivorsAtColony.length}):</strong>
                    <div>${survivorsAtColony.join(", ") || "<em>(Không có ai)</em>"}</div>
                </div>
                <div style="margin-top: 12px;">
                    <strong>6 Lối vào (Entrances - Max 3 Zombie+Barricade/cổng):</strong>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px;">
                        ${(colony.entrances || []).map((ent: any, idx: number) => {
                            const occupied = ent.zombie + ent.barricade;
                            return `
                                <div style="border: 1px solid #ccc; padding: 6px; border-radius: 4px; background: #fdfdfd; font-size: 12px;">
                                    <strong>Cổng ${idx + 1}</strong> (${occupied}/${ent.maxZombieCapacity} slots):
                                    <div>🧟 Zombie: <strong>${ent.zombie}</strong></div>
                                    <div>🚧 Rào chắn: <strong>${ent.barricade}</strong></div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            </div>
        `;
    } else {
        const loc = pub.location?.[selectedLocation];
        const survivorsAtLoc = Object.entries(pub.survivorInfo || {})
            .filter(([_, info]: any) => info.location === selectedLocation)
            .map(([id, _]) => SURVIVOR_CATALOG[id]?.name || id);

        const deckCount = currentState.G?.private?.location?.[selectedLocation]?.cards?.length ?? 20;
        const occupied = (loc?.entrance?.zombie ?? 0) + (loc?.entrance?.barricade ?? 0);

        container.innerHTML = `
            <div style="font-size: 14px;">
                <h4 style="color: #1e3a8a;">📍 ${loc?.id || selectedLocation}</h4>
                <div class="row">
                    <span>Survivors: <strong>${loc?.survivorNumber ?? 0}/${loc?.maxSurvivorNumber ?? 4}</strong></span> |
                    <span>Tiếng ồn (Noise): <strong>${loc?.noise ?? 0}/${loc?.maxNoise ?? 4}</strong></span>
                </div>
                <div style="margin: 6px 0;">
                    <span>Slots Zombie+Barricade: <strong>${occupied}/${loc?.entrance?.maxZombieCapacity ?? 3}</strong></span>
                    <div>🧟 Zombie: <strong>${loc?.entrance?.zombie ?? 0}</strong> | 🚧 Rào chắn: <strong>${loc?.entrance?.barricade ?? 0}</strong></div>
                    <div>📦 Thẻ bài còn lại: <strong>${deckCount}</strong> lá</div>
                </div>
                <div style="margin-top: 10px;">
                    <strong>Survivors đang có mặt:</strong>
                    <div>${survivorsAtLoc.join(", ") || "<em>(Không có ai)</em>"}</div>
                </div>
            </div>
        `;
    }
}

function startClient(matchID: string, playerID: string) {
    currentMatchId = matchID;
    currentPlayerId = playerID;

    const lobbySec = document.getElementById("lobby-section");
    const gameSec = document.getElementById("game-section");
    if (lobbySec) lobbySec.style.display = "none";
    if (gameSec) gameSec.style.display = "block";

    log(`Kết nối tới phòng: ${matchID} với Player ID: ${playerID}`);

    gameClient = Client({
        game: DEAD_OF_WINTER_GAME,
        multiplayer: SocketIO({ server: SERVER_URL }),
        debug: { collapseOnLoad: true },
    });

    gameClient.updateMatchID(matchID);
    gameClient.updatePlayerID(playerID);
    gameClient.start();

    gameClient.subscribe((state: any) => {
        if (!state) return;
        currentState = state;
        renderUI();
    });

    bindActionButtons();
}

function bindActionButtons() {
    function on(id: string, cb: () => void) {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = cb;
    }

    const getSelectedSurvivor = () => {
        const sel = document.getElementById("action-select-survivor") as HTMLSelectElement;
        return sel?.value || "";
    };

    const getSelectedDieIndex = () => {
        const inp = document.getElementById("input-die-index") as HTMLInputElement;
        return Number(inp?.value || 0);
    };

    // Location selector
    const selectLocationEl = document.getElementById("select-location") as HTMLSelectElement;
    if (selectLocationEl) {
        selectLocationEl.onchange = () => {
            selectedLocation = selectLocationEl.value;
            renderLocationDetail();
        };
    }

    // Survivor moves
    on("btn-act-move", () => {
        const sId = getSelectedSurvivor();
        const toLoc = (document.getElementById("move-target-location") as HTMLSelectElement)?.value;
        if (sId && toLoc) {
            gameClient.moves?.moveSurvivor?.(sId, toLoc);
            log(`Move survivor ${sId} -> ${toLoc}`);
        }
    });

    on("btn-act-mark-moved", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.markAsMoved?.(sId);
            log(`Marked ${sId} as moved`);
        }
    });

    on("btn-act-unmark-moved", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.markAsNotMoved?.(sId);
            log(`Undo moved for ${sId}`);
        }
    });

    // Wounds
    on("btn-act-add-wound", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.receiveWound?.(sId, "wound");
            log(`Added 1 wound to ${sId}`);
        }
    });

    on("btn-act-add-frostbite", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.receiveWound?.(sId, "frostbite");
            log(`Added 1 frostbite to ${sId}`);
        }
    });

    on("btn-act-remove-wound", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.removeWound?.(sId, "wound", 1);
            log(`Healed 1 wound from ${sId}`);
        }
    });

    on("btn-act-clear-wounds", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.removeAllWound?.(sId);
            log(`Cleared all wounds on ${sId}`);
        }
    });

    // Remove Survivor
    on("btn-act-remove-survivor", () => {
        const sId = getSelectedSurvivor();
        if (sId) {
            gameClient.moves?.removeSurvivor?.(sId);
            gameClient.moves?.putCardToDeck?.("removedSurvivor", [sId], "top");
            log(`Removed survivor ${sId} from board to removedSurvivor deck`);
        }
    });

    // Spawn Survivor (Thuần túy nguyên tử - KHÔNG tự ý tăng morale)
    on("btn-act-spawn-survivor", () => {
        const sId = (document.getElementById("select-spawn-survivor") as HTMLSelectElement)?.value;
        const atLoc = (document.getElementById("select-spawn-location") as HTMLSelectElement)?.value || "colony";
        if (sId) {
            gameClient.moves?.removeCardFromDeck?.("removedSurvivor", [sId]);
            gameClient.moves?.removeCardFromDeck?.("survivor", [sId]);
            gameClient.moves?.spawnSurvivor?.(sId, currentPlayerId, atLoc);
            log(`Spawned survivor ${sId} to ${atLoc} for Player ${currentPlayerId}`);
        }
    });

    on("btn-act-put-survivor-deck", () => {
        const sId = (document.getElementById("select-spawn-survivor") as HTMLSelectElement)?.value;
        if (sId) {
            gameClient.moves?.removeCardFromDeck?.("removedSurvivor", [sId]);
            gameClient.moves?.putCardToDeck?.("survivor", [sId], "shuffle");
            log(`Put survivor ${sId} back to survivorDeck (shuffled)`);
        }
    });

    // Zombie & Barricade & Noise (Đảm bảo tổng zombie + barricade <= maxZombieCapacity)
    on("btn-act-spawn-zombie", () => {
        if (selectedLocation === "colony") {
            const entrance = Number((document.getElementById("act-colony-entrance") as HTMLSelectElement)?.value || 1);
            gameClient.moves?.spawnZombieAtColony?.(entrance, 1);
            log(`Spawned 1 zombie at Colony cổng ${entrance}`);
        } else {
            gameClient.moves?.spawnZombieAtLocation?.(selectedLocation, 1);
            log(`Spawned 1 zombie at ${selectedLocation}`);
        }
    });

    on("btn-act-remove-zombie", () => {
        if (selectedLocation === "colony") {
            const entrance = Number((document.getElementById("act-colony-entrance") as HTMLSelectElement)?.value || 1);
            gameClient.moves?.removeZombieAtColony?.(entrance, 1);
            log(`Removed 1 zombie at Colony cổng ${entrance}`);
        } else {
            gameClient.moves?.removeZombieAtLocation?.(selectedLocation, 1);
            log(`Removed 1 zombie at ${selectedLocation}`);
        }
    });

    on("btn-act-build-barricade", () => {
        if (selectedLocation === "colony") {
            const entrance = Number((document.getElementById("act-colony-entrance") as HTMLSelectElement)?.value || 1);
            gameClient.moves?.buildBarricadeAtColony?.(entrance, 1);
            log(`Built 1 barricade at Colony cổng ${entrance}`);
        } else {
            gameClient.moves?.buildBarricadeAtLocation?.(selectedLocation, 1);
            log(`Built 1 barricade at ${selectedLocation}`);
        }
    });

    on("btn-act-remove-barricade", () => {
        if (selectedLocation === "colony") {
            const entrance = Number((document.getElementById("act-colony-entrance") as HTMLSelectElement)?.value || 1);
            gameClient.moves?.removeBarricadeAtColony?.(entrance, 1);
            log(`Removed 1 barricade at Colony cổng ${entrance}`);
        } else {
            gameClient.moves?.removeBarricadeAtLocation?.(selectedLocation, 1);
            log(`Removed 1 barricade at ${selectedLocation}`);
        }
    });

    on("btn-act-add-noise", () => {
        if (selectedLocation !== "colony") {
            gameClient.moves?.addNoise?.(selectedLocation, 1);
            log(`Added 1 noise at ${selectedLocation}`);
        }
    });

    on("btn-act-remove-noise", () => {
        if (selectedLocation !== "colony") {
            gameClient.moves?.removeNoise?.(selectedLocation, 1);
            log(`Removed 1 noise at ${selectedLocation}`);
        }
    });

    // Action Dice Controls
    on("btn-act-add-die", () => {
        gameClient.moves?.addActionDie?.(currentPlayerId);
        log(`Added 1 action die to Player ${currentPlayerId}`);
    });

    on("btn-act-reroll-one-die", () => {
        const idx = getSelectedDieIndex();
        gameClient.moves?.rerollActionDie?.(currentPlayerId, idx);
        log(`Rerolled action die [index ${idx}] for Player ${currentPlayerId}`);
    });

    on("btn-act-used-to-unused", () => {
        const idx = getSelectedDieIndex();
        gameClient.moves?.bringUsedDieToUnused?.(currentPlayerId, idx);
        log(`Moved die [index ${idx}] from Used -> Unused`);
    });

    on("btn-act-unused-to-used", () => {
        const idx = getSelectedDieIndex();
        gameClient.moves?.bringUnusedDieToUsed?.(currentPlayerId, idx);
        log(`Moved die [index ${idx}] from Unused -> Used`);
    });

    on("btn-act-reroll-all-dice", () => {
        gameClient.moves?.rerollAllActionDie?.(currentPlayerId);
        log(`Rerolled all action dice for Player ${currentPlayerId}`);
    });

    on("btn-act-roll-d6", () => {
        gameClient.moves?.rollSixSideDice?.();
    });

    on("btn-act-roll-exposure", () => {
        gameClient.moves?.rollExposureDice?.();
    });

    // Tài nguyên & Helpless Survivors
    on("btn-act-add-helpless", () => {
        gameClient.moves?.addHelplessSurvivor?.(1);
        log(`Added 1 helpless survivor to Colony`);
    });

    on("btn-act-remove-helpless", () => {
        gameClient.moves?.removeHelplessSurvivor?.(1);
        log(`Removed 1 helpless survivor from Colony`);
    });

    on("btn-act-add-food", () => {
        gameClient.moves?.addFood?.(1);
        log(`Added 1 food token`);
    });

    on("btn-act-remove-food", () => {
        gameClient.moves?.removeFood?.(1);
        log(`Removed 1 food token`);
    });

    on("btn-act-add-starv", () => {
        gameClient.moves?.addStarvation?.(1);
        log(`Added 1 starvation token`);
    });

    on("btn-act-remove-starv", () => {
        gameClient.moves?.removeStarvation?.(1);
        log(`Removed 1 starvation token`);
    });

    on("btn-act-inc-morale", () => {
        gameClient.moves?.changeMorale?.(1);
        log(`Morale +1`);
    });

    on("btn-act-dec-morale", () => {
        gameClient.moves?.changeMorale?.(-1);
        log(`Morale -1`);
    });

    on("btn-act-dec-round", () => {
        gameClient.moves?.changeRound?.(-1);
        log(`Round -1`);
    });

    // =========================================================================
    // ADMIN DECK EXPLORER & TRA CỨU THẺ BÀI
    // =========================================================================
    const getAdminDeck = () => {
        return (document.getElementById("admin-select-deck") as HTMLSelectElement)?.value as any;
    };
    const getAdminSearchCard = () => {
        return (document.getElementById("admin-search-card") as HTMLInputElement)?.value?.trim() || "";
    };

    on("btn-admin-lookup", () => {
        const deckId = getAdminDeck();
        const cardId = getAdminSearchCard();
        const resultEl = document.getElementById("admin-lookup-result");
        if (!resultEl) return;

        if (!currentState?.G) {
            resultEl.textContent = "Chưa kết nối game!";
            return;
        }

        const deck = getDeck(currentState.G, deckId);
        if (!deck) {
            resultEl.textContent = `❌ Deck [${deckId}] không tồn tại.`;
            return;
        }

        if (!cardId) {
            resultEl.innerHTML = `📦 Deck <strong>${deckId}</strong>: Có <strong>${deck.cards.length}</strong> lá trong xấp, <strong>${deck.reveal.length}</strong> lá đang lật.`;
            return;
        }

        const counts = getCardCountInDeck(currentState.G, cardId, deckId);
        if (counts.total > 0) {
            resultEl.innerHTML = `✅ Tìm thấy <strong>${cardId}</strong>: <strong>${counts.total} lá</strong> (${counts.inCards} lá trong deck, ${counts.inReveal} lá đang lật).`;
        } else {
            resultEl.innerHTML = `❌ Không tìm thấy lá <strong>${cardId}</strong> trong deck ${deckId}.`;
        }
    });

    on("btn-admin-reveal", () => {
        const deckId = getAdminDeck();
        gameClient.moves?.reveal?.(deckId, 1);
        log(`[Admin] Revealed 1 card from deck ${deckId}`);
    });

    on("btn-admin-clear-reveal", () => {
        const deckId = getAdminDeck();
        gameClient.moves?.clearReveal?.(deckId, "bottom");
        log(`[Admin] Cleared revealed cards back to bottom of ${deckId}`);
    });

    on("btn-admin-shuffle", () => {
        const deckId = getAdminDeck();
        gameClient.moves?.shuffleDeck?.(deckId);
        log(`[Admin] Shuffled deck ${deckId}`);
    });

    on("btn-admin-draw", () => {
        const deckId = getAdminDeck();
        gameClient.moves?.draw?.(deckId, currentPlayerId);
        log(`[Admin] Drew top card from ${deckId} to Player ${currentPlayerId} hand`);
    });

    on("btn-admin-take-card", () => {
        const deckId = getAdminDeck();
        const cardId = getAdminSearchCard();
        if (!cardId) {
            alert("Vui lòng nhập Card ID cần lấy từ deck ra tay!");
            return;
        }
        gameClient.moves?.takeCardFromDeck?.(deckId, cardId, currentPlayerId);
        log(`[Admin] Took card ${cardId} from deck ${deckId} into Player ${currentPlayerId} hand`);
    });

    on("btn-admin-take-reveal", () => {
        const deckId = getAdminDeck();
        const cardId = getAdminSearchCard();
        if (!cardId) {
            alert("Vui lòng nhập Card ID cần lấy từ chồng bài đã lật (reveal)!");
            return;
        }
        gameClient.moves?.takeCardFromReveal?.(deckId, cardId, currentPlayerId);
        log(`[Admin] Took card ${cardId} from reveal of ${deckId} into Player ${currentPlayerId} hand`);
    });

    on("btn-admin-put-top", () => {
        const deckId = getAdminDeck();
        const cardId = getAdminSearchCard();
        if (!cardId) {
            alert("Vui lòng nhập Card ID để đặt vào đầu deck!");
            return;
        }
        // Gọi putCardToDeck với fromPlayerId để xác thực bài PHẢI có trong hand
        gameClient.moves?.putCardToDeck?.(deckId, [cardId], "top", currentPlayerId);
        log(`[Admin] Put card ${cardId} from hand to top of ${deckId}`);
    });

    on("btn-admin-put-bottom", () => {
        const deckId = getAdminDeck();
        const cardId = getAdminSearchCard();
        if (!cardId) {
            alert("Vui lòng nhập Card ID để đặt vào đáy deck!");
            return;
        }
        // Gọi putCardToDeck với fromPlayerId để xác thực bài PHẢI có trong hand
        gameClient.moves?.putCardToDeck?.(deckId, [cardId], "bottom", currentPlayerId);
        log(`[Admin] Put card ${cardId} from hand to bottom of ${deckId}`);
    });

    // ==========================================
    // GAME PHASE CONTROLS
    // ==========================================
    on("btn-phase-choose-leader", () => {
        const sId = getSelectedSurvivor();
        gameClient.moves?.chooseGroupLeader?.(currentPlayerId, sId);
        log(`[Phase] Set ${sId} as Group Leader for Player ${currentPlayerId}`);
    });

    on("btn-phase-start-game", () => {
        gameClient.moves?.startGame?.();
        log(`[Phase] Game Started! Entered startRound phase`);
    });

    on("btn-phase-reveal-crisis", () => {
        gameClient.moves?.revealCrisis?.();
        log(`[Phase] Revealed Crisis for new round`);
    });

    on("btn-phase-roll-dice", () => {
        gameClient.moves?.rollRoundActionDice?.();
        log(`[Phase] Rolled round action dice for all players`);
    });

    on("btn-phase-start-player-phase", () => {
        gameClient.moves?.startPlayerPhase?.();
        log(`[Phase] Started Player Phase`);
    });

    on("btn-phase-start-turn", () => {
        gameClient.moves?.startPlayerTurn?.(currentPlayerId);
        log(`[Phase] Started turn for Player ${currentPlayerId} (resolved Frostbite)`);
    });

    on("btn-phase-end-turn", () => {
        gameClient.moves?.endPlayerTurn?.();
        log(`[Phase] Ended turn for Player ${currentPlayerId}`);
    });

    on("btn-phase-search-noise", () => {
        const sId = getSelectedSurvivor();
        gameClient.moves?.searchMakeNoise?.(sId);
        log(`[Phase] Searched with noise for ${sId}`);
    });

    on("btn-phase-finish-search", () => {
        const sId = getSelectedSurvivor();
        const s = currentState?.G?.public?.survivorInfo?.[sId];
        const loc = s?.location;
        const reveal = currentState?.G?.private?.location?.[loc]?.reveal || [];
        if (reveal.length === 0) {
            alert("Không có lá bài nào trong reveal để giữ lại!");
            return;
        }
        const kept = reveal[0];
        gameClient.moves?.finishSearch?.(sId, kept);
        log(`[Phase] Finished search for ${sId}, kept ${kept}`);
    });

    on("btn-phase-attack-survivor", () => {
        const sId = getSelectedSurvivor();
        const dieIdx = getSelectedDieIndex();
        const s = currentState?.G?.public?.survivorInfo?.[sId];
        const loc = s?.location;
        const otherSurvivors = Object.entries(currentState?.G?.public?.survivorInfo || {})
            .filter(([otherId, info]: any) => otherId !== sId && info.location === loc)
            .map(([otherId]) => otherId);
        if (otherSurvivors.length === 0) {
            alert(`Không có survivor nào khác tại ${loc} để tấn công!`);
            return;
        }
        const targetId = otherSurvivors[0];
        gameClient.moves?.attackSurvivor?.(sId, targetId, dieIdx);
        log(`[Phase] ${sId} attacked ${targetId} using die index ${dieIdx}`);
    });

    // Colony Phase 7 bước
    on("btn-phase-pay-food", () => {
        gameClient.moves?.payFood?.();
        log(`[Colony Phase] Step 1: Pay Food completed`);
    });

    on("btn-phase-check-waste", () => {
        gameClient.moves?.checkWaste?.();
        log(`[Colony Phase] Step 2: Check Waste completed`);
    });

    on("btn-phase-resolve-crisis", () => {
        gameClient.moves?.resolveCrisis?.();
        log(`[Colony Phase] Step 3: Resolve Crisis completed`);
    });

    on("btn-phase-add-zombies", () => {
        gameClient.moves?.addColonyZombies?.();
        log(`[Colony Phase] Step 4: Add Colony Zombies & Noise resolved`);
    });

    on("btn-phase-check-obj", () => {
        gameClient.moves?.checkMainObjective?.();
        log(`[Colony Phase] Step 5: Check Main Objective completed`);
    });

    on("btn-phase-advance-round", () => {
        gameClient.moves?.advanceRoundTracker?.();
        log(`[Colony Phase] Step 6: Advance Round Tracker (-1 round)`);
    });

    on("btn-phase-pass-first-player", () => {
        gameClient.moves?.passFirstPlayerToken?.();
        log(`[Colony Phase] Step 7: Pass First Player Token & returned to startRound`);
    });

    on("btn-phase-run-full-colony", () => {
        gameClient.moves?.payFood?.();
        gameClient.moves?.checkWaste?.();
        gameClient.moves?.resolveCrisis?.();
        gameClient.moves?.addColonyZombies?.();
        gameClient.moves?.checkMainObjective?.();
        gameClient.moves?.advanceRoundTracker?.();
        gameClient.moves?.passFirstPlayerToken?.();
        log(`[Colony Phase] ⚡ Ran Full Colony Phase (All 7 steps)!`);
    });
}

// Khởi tạo sự kiện màn hình đầu tiên (Lobby)
window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramMatch = urlParams.get("matchID");
    const paramPlayer = urlParams.get("playerID");

    if (paramMatch && paramPlayer !== null) {
        startClient(paramMatch, paramPlayer);
        return;
    }

    const btnCreateHost = document.getElementById("btn-create-host");
    const btnJoin = document.getElementById("btn-join");
    const inputMatch = document.getElementById("input-match-id") as HTMLInputElement;
    const lobbyMsg = document.getElementById("lobby-message");

    btnCreateHost?.addEventListener("click", () => {
        const randomMatchId = "match_" + Math.random().toString(36).substring(2, 7);
        const autoPlayerId = "0";

        if (lobbyMsg) {
            lobbyMsg.innerHTML = `Đã tạo Host! Match ID: <b>${randomMatchId}</b> | Player ID: <b>${autoPlayerId}</b>.<br>Đang vào game...`;
        }
        setTimeout(() => {
            startClient(randomMatchId, autoPlayerId);
        }, 300);
    });

    btnJoin?.addEventListener("click", () => {
        const matchId = inputMatch?.value?.trim();
        if (!matchId) {
            alert("Vui lòng nhập match_id!");
            return;
        }
        const autoPlayerId = "0";
        if (lobbyMsg) {
            lobbyMsg.innerHTML = `Tham gia Match: <b>${matchId}</b> với Player ID: <b>${autoPlayerId}</b>.<br>Đang vào game...`;
        }
        setTimeout(() => {
            startClient(matchId, autoPlayerId);
        }, 300);
    });
});