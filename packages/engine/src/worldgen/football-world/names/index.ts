import ar from "./ar.json" with { type: "json" };
import de from "./de.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import es from "./es.json" with { type: "json" };
import fr from "./fr.json" with { type: "json" };
import it from "./it.json" with { type: "json" };
import ja from "./ja.json" with { type: "json" };
import ko from "./ko.json" with { type: "json" };
import nl from "./nl.json" with { type: "json" };
import pt from "./pt.json" with { type: "json" };
import ru from "./ru.json" with { type: "json" };
import tr from "./tr.json" with { type: "json" };
import zh from "./zh.json" with { type: "json" };

/**
 * Bancos de nomes por idioma (024 R3): nomes de pessoas comuns, sobrenomes comuns e palavras
 * genéricas para clubes. As combinações geradas são fictícias; o teste de bloqueio impede nomes
 * inteiros de clubes ou jogadores reais.
 */
export interface FootballNameBank {
  firstNames: readonly string[];
  surnames: readonly string[];
  clubPrefixes: readonly string[];
  clubSuffixes: readonly string[];
  competitionAdjectives: readonly string[];
}

export const NAME_BANKS: Readonly<Record<string, FootballNameBank>> = {
  ar,
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  nl,
  pt,
  ru,
  tr,
  zh,
};

export function nameBankOf(language: string): FootballNameBank | undefined {
  return NAME_BANKS[language];
}
