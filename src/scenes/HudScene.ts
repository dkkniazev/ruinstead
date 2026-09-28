import Phaser from 'phaser';
import { GameUI, type GameUIState } from '../game/ui/GameUI';
import * as E from '../game/ui/HudEvents';

type HudSceneData = {
  initialCombatState: GameUIState['combat']; initialGatheringState: GameUIState['gathering'];
  initialSettlementState: GameUIState['settlement']; initialUpgradeState: GameUIState['upgrade'];
  initialQuestState: GameUIState['quest']; initialBestiaryState: GameUIState['bestiary'];
  initialCityState: GameUIState['city']; initialMonetizationState: GameUIState['monetization'];
  initialPlayerProgressState: GameUIState['progress']; initialPremiumState: GameUIState['premium'];
  initialCharacterState: GameUIState['character']; initialAreaName: string;
};
const stateEvents: [string, keyof GameUIState][] = [
  [E.HUD_COMBAT_STATE_EVENT,'combat'],[E.HUD_GATHERING_STATE_EVENT,'gathering'],
  [E.HUD_SETTLEMENT_STATE_EVENT,'settlement'],[E.HUD_UPGRADE_STATE_EVENT,'upgrade'],
  [E.HUD_QUEST_STATE_EVENT,'quest'],[E.HUD_BESTIARY_STATE_EVENT,'bestiary'],
  [E.HUD_CITY_STATE_EVENT,'city'],[E.HUD_MONETIZATION_STATE_EVENT,'monetization'],
  [E.HUD_PLAYER_PROGRESS_STATE_EVENT,'progress'],[E.HUD_PREMIUM_STATE_EVENT,'premium'],
  [E.HUD_CHARACTER_STATE_EVENT,'character'],[E.HUD_AREA_EVENT,'area'],
  [E.HUD_INTERACTION_STATE_EVENT,'interaction'],
];
export class HudScene extends Phaser.Scene {
  private ui?: GameUI;
  private dataState!: HudSceneData;
  private pausedWorld = false;
  constructor(){super('HudScene');}
  init(data: HudSceneData): void { this.dataState=data; }
  get hasOpenPanel(): boolean { return this.ui?.hasOpenPanel ?? false; }
  create(): void {
    const d=this.dataState;
    this.ui=new GameUI({combat:d.initialCombatState,gathering:d.initialGatheringState,
      settlement:d.initialSettlementState,upgrade:d.initialUpgradeState,quest:d.initialQuestState,
      bestiary:d.initialBestiaryState,city:d.initialCityState,monetization:d.initialMonetizationState,
      progress:d.initialPlayerProgressState,premium:d.initialPremiumState,character:d.initialCharacterState,area:d.initialAreaName},
      (event,...args)=>this.game.events.emit(event,...args),(open)=>{
        if(open && this.scene.isActive('WorldScene')){this.scene.pause('WorldScene');this.pausedWorld=true;}
        else if(!open && this.pausedWorld){this.scene.resume('WorldScene');this.pausedWorld=false;}
      });
    const cleanups:(()=>void)[]=[];
    for(const [event,key] of stateEvents){
      const handler=(state:GameUIState[typeof key]):void=>this.ui?.update(key,state);
      this.game.events.on(event,handler);cleanups.push(()=>this.game.events.off(event,handler));
    }
    const notice=(message:string):void=>this.ui?.notice(message);
    const tutorial=(step:E.TutorialHudStep):void=>this.ui?.tutorial(step);
    const story=(beat:E.StoryHudBeat):void=>this.ui?.story(beat);
    const returnedHome=():void=>this.ui?.close();
    const openForge=():void=>this.ui?.open('forge');
    this.game.events.on(E.HUD_OPEN_FORGE_EVENT,openForge);
    cleanups.push(()=>this.game.events.off(E.HUD_OPEN_FORGE_EVENT,openForge));
    this.game.events.on(E.HUD_RETURN_HOME_COMPLETED_EVENT,returnedHome);
    const level=(event:E.LevelUpHudEvent):void=>this.ui?.levelUp(event);
    this.game.events.on(E.HUD_NOTICE_EVENT,notice);this.game.events.on(E.HUD_TUTORIAL_EVENT,tutorial);this.game.events.on(E.HUD_STORY_EVENT,story);this.game.events.on(E.HUD_LEVEL_UP_EVENT,level);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      cleanups.forEach(fn=>fn());this.game.events.off(E.HUD_NOTICE_EVENT,notice);this.game.events.off(E.HUD_TUTORIAL_EVENT,tutorial);this.game.events.off(E.HUD_STORY_EVENT,story);this.game.events.off(E.HUD_LEVEL_UP_EVENT,level);
      this.game.events.off(E.HUD_RETURN_HOME_COMPLETED_EVENT,returnedHome);
      this.ui?.destroy();this.ui=undefined;
    });
  }
}
