import type { SpeciesIndication, Restriction } from '../types/drug.js';
import { cleanHtml } from './normalizer-basic.js';

export interface SpeciesDef {
  id: string;
  nameZh: string;
  aliases: string[];
  group?: string;
}

export interface SpeciesMapData {
  species: SpeciesDef[];
  generics: Record<string, string[]>;
}

export class SpeciesNormalizer {
  private aliasToId: Map<string, string> = new Map();
  private speciesMap: Map<string, SpeciesDef> = new Map();
  private generics: Record<string, string[]> = {};
  public unmappedWords: Map<string, number> = new Map();

  constructor(mapData: SpeciesMapData) {
    this.generics = mapData.generics || {};
    for (const sp of mapData.species) {
      this.speciesMap.set(sp.id, sp);
      this.aliasToId.set(sp.nameZh, sp.id);
      for (const alias of sp.aliases) {
        this.aliasToId.set(alias, sp.id);
      }
    }
  }

  public detectRestrictions(text: string): {
    henRestriction: boolean;
    duckRestriction: boolean;
    poultryEggRestriction: boolean;
    matchedText?: string;
  } {
    let henRestriction = false;
    let duckRestriction = false;
    let poultryEggRestriction = false;

    // Hen egg restrictions
    if (
      /不含.{0,6}產蛋中之蛋雞|不含蛋雞|產蛋中之蛋雞除外|蛋雞除外|產蛋期禁用|蛋雞禁用|產蛋中禁用/.test(
        text
      )
    ) {
      henRestriction = true;
    }

    // Duck egg restrictions
    if (/不含.{0,6}產蛋中之蛋鴨|不含蛋鴨|產蛋中之蛋鴨除外|蛋鴨除外|蛋鴨禁用/.test(text)) {
      duckRestriction = true;
    }

    // Poultry egg general restrictions
    if (/不含.{0,6}產蛋中之蛋禽|蛋禽除外|蛋禽禁用/.test(text)) {
      poultryEggRestriction = true;
      henRestriction = true;
      duckRestriction = true;
    }

    // Conservative check: any other negative egg-laying statement
    if (!henRestriction && !duckRestriction && !poultryEggRestriction) {
      if (/不含.{0,6}產蛋|產蛋.{0,6}(?:除外|禁用|勿用|不得)/.test(text)) {
        // Conservatively treat as hen restriction
        henRestriction = true;
      }
    }

    return { henRestriction, duckRestriction, poultryEggRestriction };
  }

  public extractSpeciesIndications(rawIndication: string | undefined | null): {
    indications: SpeciesIndication[];
    cleanedText: string;
    hasColonStructure: boolean;
  } {
    const cleanedText = cleanHtml(rawIndication);
    if (!cleanedText.trim()) {
      return { indications: [], cleanedText, hasColonStructure: false };
    }

    // Regex to match colon structures: e.g. "豬：..." or "\n雞（不含產蛋中之蛋雞）：..."
    const colonPattern = /(?:^|[。\n；;\r])\s*([^\n。；;：:]{1,30})[：:]\s*/g;
    const matches: { header: string; contentStart: number; nextBoundary: number }[] = [];

    let m: RegExpExecArray | null;
    while ((m = colonPattern.exec(cleanedText)) !== null) {
      const header = m[1].trim();
      const contentStart = m.index + m[0].length;
      matches.push({
        header,
        contentStart,
        nextBoundary: m.index,
      });
    }

    if (matches.length === 0) {
      // Fallback: No colon structure detected
      const fallbackIndications = this.extractFallback(cleanedText);
      return {
        indications: fallbackIndications,
        cleanedText,
        hasColonStructure: false,
      };
    }

    const indications: SpeciesIndication[] = [];

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const contentStart = current.contentStart;
      const contentEnd = next ? next.nextBoundary : cleanedText.length;
      const indicationBody = cleanedText.slice(contentStart, contentEnd).trim();

      const parsedItems = this.parseHeader(current.header, indicationBody);
      indications.push(...parsedItems);
    }

    return {
      indications,
      cleanedText,
      hasColonStructure: true,
    };
  }

  private parseHeader(header: string, indicationBody: string): SpeciesIndication[] {
    const restrictions = this.detectRestrictions(header);

    // Strip bracketed text to extract species tokens
    let cleanHeader = header.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
    
    // Handle phrases like "蛋鴨除外之鴨" -> "鴨"
    cleanHeader = cleanHeader.replace(/.*除外之/g, '');
    cleanHeader = cleanHeader.replace(/不含.+之/g, '');

    const tokens = cleanHeader
      .split(/[、,，及與\/／]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const result: SpeciesIndication[] = [];

    for (const token of tokens) {
      // Check if it's a generic group
      if (this.generics[token]) {
        const memberIds = this.generics[token];
        for (const spId of memberIds) {
          const spDef = this.speciesMap.get(spId);
          const spRestrictions: Restriction[] = [];
          if (spId === 'chicken' && (restrictions.henRestriction || restrictions.poultryEggRestriction)) {
            spRestrictions.push('not-laying-hens');
          }
          if (spId === 'duck' && (restrictions.duckRestriction || restrictions.poultryEggRestriction)) {
            spRestrictions.push('not-laying-ducks');
          }
          result.push({
            species: spId,
            label: spDef?.nameZh || token,
            restrictions: spRestrictions,
            generic: true,
            indication: indicationBody,
          });
        }
        continue;
      }

      // Check single species
      const spId = this.aliasToId.get(token);
      if (spId) {
        const spRestrictions: Restriction[] = [];
        if (spId === 'chicken' && (restrictions.henRestriction || restrictions.poultryEggRestriction)) {
          spRestrictions.push('not-laying-hens');
        }
        if (spId === 'duck' && (restrictions.duckRestriction || restrictions.poultryEggRestriction)) {
          spRestrictions.push('not-laying-ducks');
        }
        result.push({
          species: spId,
          label: header,
          restrictions: spRestrictions,
          generic: false,
          indication: indicationBody,
        });
      } else {
        // Track unmapped token
        this.unmappedWords.set(token, (this.unmappedWords.get(token) || 0) + 1);
      }
    }

    return result;
  }

  private extractFallback(fullText: string): SpeciesIndication[] {
    const result: SpeciesIndication[] = [];
    const seenIds = new Set<string>();

    for (const [alias, spId] of this.aliasToId.entries()) {
      if (fullText.includes(alias)) {
        if (!seenIds.has(spId)) {
          seenIds.add(spId);
          const spDef = this.speciesMap.get(spId);
          const restrictions = this.detectRestrictions(fullText);
          const spRestrictions: Restriction[] = [];
          if (spId === 'chicken' && restrictions.henRestriction) {
            spRestrictions.push('not-laying-hens');
          }
          if (spId === 'duck' && restrictions.duckRestriction) {
            spRestrictions.push('not-laying-ducks');
          }

          result.push({
            species: spId,
            label: spDef?.nameZh || alias,
            restrictions: spRestrictions,
            generic: false,
            indication: fullText,
          });
        }
      }
    }

    return result;
  }
}
