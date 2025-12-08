# LUCIDE - BUDGET PRÉVISIONNEL DÉTAILLÉ
## Exercices 2025 - 2026 - 2027

**Document confidentiel - Usage investisseurs, banques et organismes de subvention**
**Date : Décembre 2025**
**Version : 1.0**

---

# TABLE DES MATIERES

1. [Hypothèses Structurantes](#1-hypothèses-structurantes)
2. [Budget Année 1 (2025)](#2-budget-année-1-2025)
3. [Budget Année 2 (2026)](#3-budget-année-2-2026)
4. [Budget Année 3 (2027)](#4-budget-année-3-2027)
5. [Synthèse Pluriannuelle](#5-synthèse-pluriannuelle)
6. [Plan de Trésorerie](#6-plan-de-trésorerie)
7. [Analyse de Sensibilité](#7-analyse-de-sensibilité)
8. [Indicateurs Financiers](#8-indicateurs-financiers)

---

# 1. HYPOTHÈSES STRUCTURANTES

## 1.1 Hypothèses de Revenus

### Pricing

| Plan | Prix mensuel | Prix annuel | Réduction annuel |
|------|--------------|-------------|------------------|
| **Free** | 0 € | 0 € | - |
| **Pro** | 29 € | 290 € | -17% (2 mois offerts) |
| **Team** | 99 € | 990 € | -17% |
| **Enterprise** | 500 € (moy.) | 5,000 € | Négocié |

### Répartition mensuel/annuel

| Année | % Mensuel | % Annuel |
|-------|-----------|----------|
| Y1 | 70% | 30% |
| Y2 | 60% | 40% |
| Y3 | 50% | 50% |

### Taux de conversion

| Métrique | Y1 | Y2 | Y3 |
|----------|-----|-----|-----|
| Free → Pro | 10% | 12% | 15% |
| Pro → Team | 5% | 8% | 10% |
| Team → Enterprise | 2% | 4% | 5% |

### Churn mensuel

| Plan | Y1 | Y2 | Y3 |
|------|-----|-----|-----|
| Pro | 5% | 4% | 3% |
| Team | 4% | 3% | 2.5% |
| Enterprise | 2% | 1.5% | 1% |

## 1.2 Hypothèses de Coûts

### Salaires (coût employeur, France)

| Poste | Salaire brut | Charges (45%) | Coût total |
|-------|--------------|---------------|------------|
| **Fondateur/CEO** | 36,000 € | 16,200 € | 52,200 €/an |
| **Dev senior** | 55,000 € | 24,750 € | 79,750 €/an |
| **Dev junior** | 40,000 € | 18,000 € | 58,000 €/an |
| **Growth marketer** | 42,000 € | 18,900 € | 60,900 €/an |
| **Customer Success** | 35,000 € | 15,750 € | 50,750 €/an |
| **Sales (SDR)** | 32,000 € + var | 14,400 € | 46,400 € + var |
| **Office manager** | 35,000 € | 15,750 € | 50,750 €/an |

### Coûts API IA (par utilisateur actif/mois)

| Provider | Modèle | Coût estimé/user |
|----------|--------|------------------|
| **OpenAI GPT-4o** | 5$/1M input, 15$/1M output | ~1.50 €/user |
| **OpenAI GPT-4o-mini** | 0.15$/1M input, 0.60$/1M output | ~0.30 €/user |
| **Claude Sonnet** | 3$/1M input, 15$/1M output | ~1.20 €/user |
| **Gemini Flash** | 0.075$/1M input, 0.30$/1M output | ~0.20 €/user |
| **Moyenne pondérée** | Mix de modèles | **~0.80 €/user** |

### Coûts infrastructure (mensuels)

| Service | Gratuit jusqu'à | Puis |
|---------|-----------------|------|
| **Firebase** | 10K reads/jour | ~0.01€/user actif |
| **Supabase** | 500MB storage | 25€/mois base |
| **Serveur backend** | - | 50-200€/mois |
| **CDN/Hosting** | - | 20-100€/mois |
| **Monitoring** | Tier gratuit | 50-200€/mois |

## 1.3 Hypothèses de Croissance

### Acquisition utilisateurs

| Métrique | Y1 | Y2 | Y3 |
|----------|-----|-----|-----|
| Visiteurs/mois (fin année) | 50,000 | 200,000 | 800,000 |
| Taux inscription | 10% | 8% | 6% |
| Inscriptions free/mois | 5,000 | 16,000 | 48,000 |

### Base utilisateurs (fin d'année)

| Métrique | Y1 | Y2 | Y3 |
|----------|-----|-----|-----|
| Total Free (cumulé) | 30,000 | 120,000 | 400,000 |
| Total Pro | 450 | 2,200 | 10,500 |
| Total Team | 60 | 350 | 1,800 |
| Total Enterprise | 12 | 65 | 250 |
| **Total payants** | **522** | **2,615** | **12,550** |

---

# 2. BUDGET ANNÉE 1 (2025)

## 2.1 Prévisions de Revenus - Année 1

### Revenus mensuels détaillés

| Mois | Pro (nb) | Pro (€) | Team (nb) | Team (€) | Enterpr. (nb) | Enterpr. (€) | **Total** |
|------|----------|---------|-----------|----------|---------------|--------------|-----------|
| M1 | 15 | 435 | 2 | 198 | 0 | 0 | **633** |
| M2 | 25 | 725 | 3 | 297 | 0 | 0 | **1,022** |
| M3 | 40 | 1,160 | 5 | 495 | 0 | 0 | **1,655** |
| M4 | 60 | 1,740 | 8 | 792 | 1 | 500 | **3,032** |
| M5 | 85 | 2,465 | 12 | 1,188 | 1 | 500 | **4,153** |
| M6 | 115 | 3,335 | 18 | 1,782 | 2 | 1,000 | **6,117** |
| M7 | 150 | 4,350 | 24 | 2,376 | 3 | 1,500 | **8,226** |
| M8 | 190 | 5,510 | 30 | 2,970 | 4 | 2,000 | **10,480** |
| M9 | 240 | 6,960 | 38 | 3,762 | 5 | 2,500 | **13,222** |
| M10 | 300 | 8,700 | 46 | 4,554 | 7 | 3,500 | **16,754** |
| M11 | 370 | 10,730 | 52 | 5,148 | 9 | 4,500 | **20,378** |
| M12 | 450 | 13,050 | 60 | 5,940 | 12 | 6,000 | **24,990** |
| | | | | | | | |
| **Total Y1** | | **59,160** | | **29,502** | | **22,000** | **110,662** |

### Récapitulatif revenus Y1

| Source | Montant | % |
|--------|---------|---|
| Abonnements Pro | 59,160 € | 53% |
| Abonnements Team | 29,502 € | 27% |
| Abonnements Enterprise | 22,000 € | 20% |
| **Total Revenus Y1** | **110,662 €** | 100% |

## 2.2 Budget des Charges - Année 1

### Masse salariale Y1

| Poste | Recrutement | Salaire mensuel | Nb mois | **Total** |
|-------|-------------|-----------------|---------|-----------|
| Fondateur/CEO | M1 | 4,350 € | 12 | **52,200 €** |
| Dev senior | M1 | 6,645 € | 12 | **79,750 €** |
| Growth marketer | M4 | 5,075 € | 9 | **45,675 €** |
| | | | | |
| **Total Salaires Y1** | | | | **177,625 €** |

### Détail mensuel masse salariale Y1

| Mois | Fondateur | Dev senior | Growth | **Total** |
|------|-----------|------------|--------|-----------|
| M1 | 4,350 | 6,645 | 0 | **10,995** |
| M2 | 4,350 | 6,645 | 0 | **10,995** |
| M3 | 4,350 | 6,645 | 0 | **10,995** |
| M4 | 4,350 | 6,645 | 5,075 | **16,070** |
| M5 | 4,350 | 6,645 | 5,075 | **16,070** |
| M6 | 4,350 | 6,645 | 5,075 | **16,070** |
| M7 | 4,350 | 6,645 | 5,075 | **16,070** |
| M8 | 4,350 | 6,645 | 5,075 | **16,070** |
| M9 | 4,350 | 6,645 | 5,075 | **16,070** |
| M10 | 4,350 | 6,645 | 5,075 | **16,070** |
| M11 | 4,350 | 6,645 | 5,075 | **16,070** |
| M12 | 4,350 | 6,645 | 5,075 | **16,070** |
| **Total** | **52,200** | **79,740** | **45,675** | **177,615** |

### Coûts Marketing Y1

| Poste | M1-M3 | M4-M6 | M7-M9 | M10-M12 | **Total** |
|-------|-------|-------|-------|---------|-----------|
| Content/SEO | 2,000 | 4,000 | 6,000 | 8,000 | **20,000** |
| Paid Ads (LinkedIn, Google) | 1,000 | 3,000 | 6,000 | 10,000 | **20,000** |
| Events/Webinaires | 500 | 1,500 | 2,500 | 3,500 | **8,000** |
| PR/Communication | 500 | 1,000 | 1,500 | 2,000 | **5,000** |
| Tools (analytics, email) | 500 | 500 | 1,000 | 1,000 | **3,000** |
| **Total Marketing** | **4,500** | **10,000** | **17,000** | **24,500** | **56,000** |

### Coûts Infrastructure Y1

| Poste | M1-M6 (mensuel) | M7-M12 (mensuel) | **Total** |
|-------|-----------------|------------------|-----------|
| Firebase | 50 € | 100 € | **900** |
| Supabase | 25 € | 50 € | **450** |
| Serveur backend | 50 € | 100 € | **900** |
| CDN/Hosting | 30 € | 50 € | **480** |
| Monitoring/Logs | 50 € | 100 € | **900** |
| Domaines/SSL | 10 € | 10 € | **120** |
| **Total Infra** | **215 €/mois** | **410 €/mois** | **3,750** |

### Coûts API IA Y1

| Mois | Users actifs | Coût/user | **Total** |
|------|--------------|-----------|-----------|
| M1-M3 | 100-400 | 0.80 € | **720** |
| M4-M6 | 400-800 | 0.80 € | **1,440** |
| M7-M9 | 800-1,500 | 0.80 € | **2,760** |
| M10-M12 | 1,500-2,500 | 0.80 € | **4,800** |
| **Total API Y1** | | | **9,720** |

### Autres charges Y1

| Poste | Montant | Notes |
|-------|---------|-------|
| **Juridique** | 5,000 € | Statuts, CGV, RGPD, PI |
| **Comptabilité** | 3,600 € | 300€/mois |
| **Assurances** | 1,500 € | RC Pro, cyber |
| **Coworking/Bureaux** | 6,000 € | 500€/mois |
| **Matériel** | 3,000 € | Laptops, écrans |
| **Déplacements** | 2,000 € | Meetings, events |
| **Divers** | 3,000 € | Imprévus |
| **Total Autres** | **24,100 €** | |

## 2.3 Compte de Résultat Prévisionnel Y1

| Poste | M1-M3 | M4-M6 | M7-M9 | M10-M12 | **Total Y1** |
|-------|-------|-------|-------|---------|--------------|
| **REVENUS** | | | | | |
| Abonnements | 3,310 | 13,302 | 31,928 | 62,122 | **110,662** |
| | | | | | |
| **CHARGES** | | | | | |
| Salaires | 32,985 | 48,210 | 48,210 | 48,210 | **177,615** |
| Marketing | 4,500 | 10,000 | 17,000 | 24,500 | **56,000** |
| Infrastructure | 645 | 645 | 1,230 | 1,230 | **3,750** |
| API IA | 720 | 1,440 | 2,760 | 4,800 | **9,720** |
| Autres | 6,025 | 6,025 | 6,025 | 6,025 | **24,100** |
| **Total Charges** | **44,875** | **66,320** | **75,225** | **84,765** | **271,185** |
| | | | | | |
| **RÉSULTAT** | **-41,565** | **-53,018** | **-43,297** | **-22,643** | **-160,523** |

### Résultat mensuel Y1

| Mois | Revenus | Charges | Résultat | Cumul |
|------|---------|---------|----------|-------|
| M1 | 633 | 13,500 | -12,867 | -12,867 |
| M2 | 1,022 | 14,000 | -12,978 | -25,845 |
| M3 | 1,655 | 17,375 | -15,720 | -41,565 |
| M4 | 3,032 | 21,500 | -18,468 | -60,033 |
| M5 | 4,153 | 22,000 | -17,847 | -77,880 |
| M6 | 6,117 | 22,820 | -16,703 | -94,583 |
| M7 | 8,226 | 24,500 | -16,274 | -110,857 |
| M8 | 10,480 | 25,000 | -14,520 | -125,377 |
| M9 | 13,222 | 25,725 | -12,503 | -137,880 |
| M10 | 16,754 | 27,800 | -11,046 | -148,926 |
| M11 | 20,378 | 28,200 | -7,822 | -156,748 |
| M12 | 24,990 | 28,765 | -3,775 | -160,523 |

---

# 3. BUDGET ANNÉE 2 (2026)

## 3.1 Prévisions de Revenus - Année 2

### Évolution trimestrielle Y2

| Trimestre | Pro | Team | Enterprise | **Total** |
|-----------|-----|------|------------|-----------|
| Q1 | 550 | 110 | 18 | 678 |
| Q2 | 850 | 170 | 28 | 1,048 |
| Q3 | 1,400 | 250 | 45 | 1,695 |
| Q4 | 2,200 | 350 | 65 | 2,615 |

### Revenus trimestriels Y2

| Trimestre | Pro (€) | Team (€) | Enterprise (€) | **Total** |
|-----------|---------|----------|----------------|-----------|
| Q1 | 47,850 | 32,670 | 27,000 | **107,520** |
| Q2 | 73,950 | 50,490 | 42,000 | **166,440** |
| Q3 | 121,800 | 74,250 | 67,500 | **263,550** |
| Q4 | 191,400 | 103,950 | 97,500 | **392,850** |
| **Total Y2** | **435,000** | **261,360** | **234,000** | **930,360** |

### Récapitulatif revenus Y2

| Source | Montant | % | Croissance vs Y1 |
|--------|---------|---|------------------|
| Abonnements Pro | 435,000 € | 47% | +635% |
| Abonnements Team | 261,360 € | 28% | +786% |
| Abonnements Enterprise | 234,000 € | 25% | +964% |
| **Total Revenus Y2** | **930,360 €** | 100% | **+741%** |

## 3.2 Budget des Charges - Année 2

### Masse salariale Y2

| Poste | Effectif | Salaire annuel | **Total** |
|-------|----------|----------------|-----------|
| Fondateur/CEO | 1 | 60,000 € | **60,000** |
| Dev senior | 2 | 80,000 € × 2 | **160,000** |
| Dev junior | 1 | 58,000 € | **58,000** |
| Growth marketer | 1 | 61,000 € | **61,000** |
| Customer Success | 1 | 51,000 € | **51,000** |
| Sales (SDR) | 1 | 46,000 € + 12K var | **58,000** |
| Office manager (M7) | 0.5 | 25,000 € (6 mois) | **25,000** |
| | | | |
| **Total Salaires Y2** | **7.5 ETP** | | **473,000 €** |

### Évolution effectifs Y2

| Mois | Fondateur | Dev senior | Dev junior | Growth | CS | Sales | Office | **Total** |
|------|-----------|------------|------------|--------|-----|-------|--------|-----------|
| M1-M6 | 1 | 2 | 1 | 1 | 1 | 0 | 0 | **6** |
| M7-M9 | 1 | 2 | 1 | 1 | 1 | 1 | 0.5 | **7.5** |
| M10-M12 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | **8** |

### Coûts Marketing Y2

| Poste | Q1 | Q2 | Q3 | Q4 | **Total** |
|-------|-----|-----|-----|-----|-----------|
| Content/SEO | 12,000 | 15,000 | 18,000 | 20,000 | **65,000** |
| Paid Ads | 18,000 | 25,000 | 35,000 | 42,000 | **120,000** |
| Events/Conférences | 5,000 | 8,000 | 10,000 | 12,000 | **35,000** |
| PR/Communication | 3,000 | 5,000 | 6,000 | 8,000 | **22,000** |
| Tools | 2,000 | 2,500 | 3,000 | 3,500 | **11,000** |
| International (UK) | 0 | 5,000 | 10,000 | 15,000 | **30,000** |
| **Total Marketing** | **40,000** | **60,500** | **82,000** | **100,500** | **283,000** |

### Coûts Infrastructure Y2

| Poste | Mensuel (moy.) | **Total annuel** |
|-------|----------------|------------------|
| Firebase | 400 € | **4,800** |
| Supabase | 100 € | **1,200** |
| Serveur backend | 400 € | **4,800** |
| CDN/Hosting | 150 € | **1,800** |
| Monitoring | 200 € | **2,400** |
| Sécurité | 200 € | **2,400** |
| Backup/DR | 100 € | **1,200** |
| **Total Infra** | **1,550 €/mois** | **18,600** |

### Coûts API IA Y2

| Trimestre | Users actifs (moy.) | Coût/user | **Total** |
|-----------|---------------------|-----------|-----------|
| Q1 | 3,500 | 0.75 € | 7,875 |
| Q2 | 5,500 | 0.75 € | 12,375 |
| Q3 | 8,500 | 0.70 € | 17,850 |
| Q4 | 13,000 | 0.70 € | 27,300 |
| **Total API Y2** | | | **65,400** |

### Autres charges Y2

| Poste | Montant | Notes |
|-------|---------|-------|
| **Juridique** | 12,000 € | Contrats, PI, international |
| **Comptabilité/Audit** | 8,000 € | Croissance complexité |
| **Assurances** | 4,000 € | RC Pro élargie |
| **Bureaux** | 18,000 € | 1,500€/mois (plus grand) |
| **Matériel** | 10,000 € | Nouveaux employés |
| **Déplacements** | 15,000 € | International |
| **Formation** | 5,000 € | Équipe |
| **Divers** | 8,000 € | Imprévus |
| **Total Autres** | **80,000 €** | |

## 3.3 Compte de Résultat Prévisionnel Y2

| Poste | Q1 | Q2 | Q3 | Q4 | **Total Y2** |
|-------|-----|-----|-----|-----|--------------|
| **REVENUS** | 107,520 | 166,440 | 263,550 | 392,850 | **930,360** |
| | | | | | |
| **CHARGES** | | | | | |
| Salaires | 105,000 | 112,000 | 126,000 | 130,000 | **473,000** |
| Marketing | 40,000 | 60,500 | 82,000 | 100,500 | **283,000** |
| Infrastructure | 4,000 | 4,500 | 5,000 | 5,100 | **18,600** |
| API IA | 7,875 | 12,375 | 17,850 | 27,300 | **65,400** |
| Autres | 18,000 | 20,000 | 21,000 | 21,000 | **80,000** |
| **Total Charges** | **174,875** | **209,375** | **251,850** | **283,900** | **920,000** |
| | | | | | |
| **RÉSULTAT** | **-67,355** | **-42,935** | **+11,700** | **+108,950** | **+10,360** |

---

# 4. BUDGET ANNÉE 3 (2027)

## 4.1 Prévisions de Revenus - Année 3

### Évolution trimestrielle Y3

| Trimestre | Pro | Team | Enterprise | **Total** |
|-----------|-----|------|------------|-----------|
| Q1 | 4,000 | 650 | 100 | 4,750 |
| Q2 | 6,000 | 1,000 | 150 | 7,150 |
| Q3 | 8,500 | 1,400 | 200 | 10,100 |
| Q4 | 10,500 | 1,800 | 250 | 12,550 |

### Revenus trimestriels Y3

| Trimestre | Pro (€) | Team (€) | Enterprise (€) | Autres (€) | **Total** |
|-----------|---------|----------|----------------|------------|-----------|
| Q1 | 348,000 | 193,050 | 150,000 | 30,000 | **721,050** |
| Q2 | 522,000 | 297,000 | 225,000 | 50,000 | **1,094,000** |
| Q3 | 739,500 | 415,800 | 300,000 | 80,000 | **1,535,300** |
| Q4 | 913,500 | 534,600 | 375,000 | 120,000 | **1,943,100** |
| **Total Y3** | **2,523,000** | **1,440,450** | **1,050,000** | **280,000** | **5,293,450** |

### Récapitulatif revenus Y3

| Source | Montant | % | Croissance vs Y2 |
|--------|---------|---|------------------|
| Abonnements Pro | 2,523,000 € | 48% | +480% |
| Abonnements Team | 1,440,450 € | 27% | +451% |
| Abonnements Enterprise | 1,050,000 € | 20% | +349% |
| Autres (API, Services) | 280,000 € | 5% | Nouveau |
| **Total Revenus Y3** | **5,293,450 €** | 100% | **+469%** |

## 4.2 Budget des Charges - Année 3

### Masse salariale Y3

| Département | Effectif | Salaire moyen | **Total** |
|-------------|----------|---------------|-----------|
| **Direction** | 2 | 80,000 € | **160,000** |
| **Tech** | 8 | 72,000 € | **576,000** |
| **Sales** | 4 | 55,000 € + var | **280,000** |
| **Marketing** | 3 | 58,000 € | **174,000** |
| **Customer Success** | 2 | 52,000 € | **104,000** |
| **Operations** | 1 | 50,000 € | **50,000** |
| | | | |
| **Total Salaires Y3** | **20 ETP** | | **1,344,000 €** |

### Évolution effectifs Y3

| Département | Q1 | Q2 | Q3 | Q4 |
|-------------|-----|-----|-----|-----|
| Direction | 2 | 2 | 2 | 2 |
| Tech | 6 | 7 | 8 | 8 |
| Sales | 2 | 3 | 4 | 4 |
| Marketing | 2 | 2 | 3 | 3 |
| Customer Success | 1 | 2 | 2 | 2 |
| Operations | 1 | 1 | 1 | 1 |
| **Total** | **14** | **17** | **20** | **20** |

### Coûts Marketing Y3

| Poste | Q1 | Q2 | Q3 | Q4 | **Total** |
|-------|-----|-----|-----|-----|-----------|
| Content/SEO | 25,000 | 30,000 | 35,000 | 40,000 | **130,000** |
| Paid Ads | 50,000 | 65,000 | 80,000 | 95,000 | **290,000** |
| Events/Conférences | 20,000 | 25,000 | 30,000 | 35,000 | **110,000** |
| PR/Communication | 10,000 | 12,000 | 15,000 | 18,000 | **55,000** |
| Brand/Awareness | 15,000 | 20,000 | 25,000 | 30,000 | **90,000** |
| International | 20,000 | 30,000 | 40,000 | 50,000 | **140,000** |
| Tools | 5,000 | 6,000 | 7,000 | 8,000 | **26,000** |
| **Total Marketing** | **145,000** | **188,000** | **232,000** | **276,000** | **841,000** |

### Coûts Infrastructure Y3

| Poste | Mensuel (moy.) | **Total annuel** |
|-------|----------------|------------------|
| Firebase | 2,000 € | **24,000** |
| Supabase | 500 € | **6,000** |
| Serveurs backend | 3,000 € | **36,000** |
| CDN/Hosting | 800 € | **9,600** |
| Monitoring/APM | 600 € | **7,200** |
| Sécurité | 1,000 € | **12,000** |
| Backup/DR | 500 € | **6,000** |
| DevOps tools | 400 € | **4,800** |
| **Total Infra** | **8,800 €/mois** | **105,600** |

### Coûts API IA Y3

| Trimestre | Users actifs (moy.) | Coût/user | **Total** |
|-----------|---------------------|-----------|-----------|
| Q1 | 25,000 | 0.65 € | 48,750 |
| Q2 | 40,000 | 0.65 € | 78,000 |
| Q3 | 55,000 | 0.60 € | 99,000 |
| Q4 | 70,000 | 0.60 € | 126,000 |
| **Total API Y3** | | | **351,750** |

### Autres charges Y3

| Poste | Montant | Notes |
|-------|---------|-------|
| **Juridique** | 40,000 € | International, compliance |
| **Comptabilité/Audit** | 25,000 € | Audit requis |
| **Assurances** | 15,000 € | Couverture élargie |
| **Bureaux** | 72,000 € | 6,000€/mois (20 pers) |
| **Matériel** | 30,000 € | Renouvellement + nouveaux |
| **Déplacements** | 50,000 € | Équipe + international |
| **Formation** | 20,000 € | Équipe |
| **Recrutement** | 30,000 € | Chasseurs de têtes |
| **Divers** | 20,000 € | Imprévus |
| **Total Autres** | **302,000 €** | |

## 4.3 Compte de Résultat Prévisionnel Y3

| Poste | Q1 | Q2 | Q3 | Q4 | **Total Y3** |
|-------|-----|-----|-----|-----|--------------|
| **REVENUS** | 721,050 | 1,094,000 | 1,535,300 | 1,943,100 | **5,293,450** |
| | | | | | |
| **CHARGES** | | | | | |
| Salaires | 280,000 | 340,000 | 362,000 | 362,000 | **1,344,000** |
| Marketing | 145,000 | 188,000 | 232,000 | 276,000 | **841,000** |
| Infrastructure | 22,000 | 25,000 | 28,000 | 30,600 | **105,600** |
| API IA | 48,750 | 78,000 | 99,000 | 126,000 | **351,750** |
| Autres | 68,000 | 74,000 | 80,000 | 80,000 | **302,000** |
| **Total Charges** | **563,750** | **705,000** | **801,000** | **874,600** | **2,944,350** |
| | | | | | |
| **RÉSULTAT** | **+157,300** | **+389,000** | **+734,300** | **+1,068,500** | **+2,349,100** |

---

# 5. SYNTHÈSE PLURIANNUELLE

## 5.1 Compte de Résultat Consolidé 3 Ans

| Poste | Y1 (2025) | Y2 (2026) | Y3 (2027) | **Total 3 ans** |
|-------|-----------|-----------|-----------|-----------------|
| **REVENUS** | | | | |
| Abonnements Pro | 59,160 | 435,000 | 2,523,000 | **3,017,160** |
| Abonnements Team | 29,502 | 261,360 | 1,440,450 | **1,731,312** |
| Abonnements Enterprise | 22,000 | 234,000 | 1,050,000 | **1,306,000** |
| Autres revenus | 0 | 0 | 280,000 | **280,000** |
| **Total Revenus** | **110,662** | **930,360** | **5,293,450** | **6,334,472** |
| | | | | |
| **CHARGES** | | | | |
| Salaires | 177,615 | 473,000 | 1,344,000 | **1,994,615** |
| Marketing | 56,000 | 283,000 | 841,000 | **1,180,000** |
| Infrastructure | 3,750 | 18,600 | 105,600 | **127,950** |
| API IA | 9,720 | 65,400 | 351,750 | **426,870** |
| Autres | 24,100 | 80,000 | 302,000 | **406,100** |
| **Total Charges** | **271,185** | **920,000** | **2,944,350** | **4,135,535** |
| | | | | |
| **RÉSULTAT NET** | **-160,523** | **+10,360** | **+2,349,100** | **+2,198,937** |
| | | | | |
| **Marge nette** | -145% | +1.1% | +44.4% | +34.7% |

## 5.2 Évolution des Effectifs

| Département | Y1 | Y2 | Y3 |
|-------------|-----|-----|-----|
| Direction | 1 | 1 | 2 |
| Tech | 1 | 4 | 8 |
| Sales | 0 | 1 | 4 |
| Marketing | 1 | 1 | 3 |
| Customer Success | 0 | 1 | 2 |
| Operations | 0 | 0.5 | 1 |
| **Total** | **3** | **8.5** | **20** |

## 5.3 Évolution des KPIs

| KPI | Y1 | Y2 | Y3 |
|-----|-----|-----|-----|
| **ARR (fin d'année)** | 300K € | 1.4M € | 6.3M € |
| **MRR (fin d'année)** | 25K € | 120K € | 525K € |
| **Clients payants** | 522 | 2,615 | 12,550 |
| **ARPU mensuel** | 34 € | 36 € | 35 € |
| **Churn mensuel** | 5% | 4% | 3% |
| **LTV** | 350 € | 725 € | 1,000 € |
| **CAC** | 150 € | 80 € | 60 € |
| **LTV/CAC** | 2.3x | 9.1x | 16.7x |
| **Équipe** | 3 | 8.5 | 20 |
| **Revenu/employé** | 37K € | 109K € | 265K € |

---

# 6. PLAN DE TRÉSORERIE

## 6.1 Besoins de Financement

### Calcul du besoin initial

| Élément | Montant |
|---------|---------|
| Perte Y1 | 160,523 € |
| BFR Y1 (3 mois de charges) | 70,000 € |
| Marge de sécurité (20%) | 46,000 € |
| **Besoin total** | **276,523 €** |

**Recommandation** : Lever **300,000 - 500,000 €** pour avoir une marge de manœuvre.

## 6.2 Plan de Trésorerie Mensuel Y1

| Mois | Encaiss. | Décaiss. | Solde mensuel | Tréso cumulée |
|------|----------|----------|---------------|---------------|
| **M0 (Levée)** | 400,000 | 0 | +400,000 | **400,000** |
| M1 | 633 | 13,500 | -12,867 | **387,133** |
| M2 | 1,022 | 14,000 | -12,978 | **374,155** |
| M3 | 1,655 | 17,375 | -15,720 | **358,435** |
| M4 | 3,032 | 21,500 | -18,468 | **339,967** |
| M5 | 4,153 | 22,000 | -17,847 | **322,120** |
| M6 | 6,117 | 22,820 | -16,703 | **305,417** |
| M7 | 8,226 | 24,500 | -16,274 | **289,143** |
| M8 | 10,480 | 25,000 | -14,520 | **274,623** |
| M9 | 13,222 | 25,725 | -12,503 | **262,120** |
| M10 | 16,754 | 27,800 | -11,046 | **251,074** |
| M11 | 20,378 | 28,200 | -7,822 | **243,252** |
| M12 | 24,990 | 28,765 | -3,775 | **239,477** |

**Trésorerie fin Y1** : 239,477 € (runway de ~9 mois supplémentaires)

## 6.3 Plan de Trésorerie Trimestriel Y2-Y3

| Période | Encaiss. | Décaiss. | Solde | Tréso cumulée |
|---------|----------|----------|-------|---------------|
| **Y1 fin** | | | | **239,477** |
| Y2 Q1 | 107,520 | 174,875 | -67,355 | **172,122** |
| Y2 Q2 | 166,440 | 209,375 | -42,935 | **129,187** |
| Y2 Q3 | 263,550 | 251,850 | +11,700 | **140,887** |
| Y2 Q4 | 392,850 | 283,900 | +108,950 | **249,837** |
| **Y2 fin** | | | | **249,837** |
| Y3 Q1 | 721,050 | 563,750 | +157,300 | **407,137** |
| Y3 Q2 | 1,094,000 | 705,000 | +389,000 | **796,137** |
| Y3 Q3 | 1,535,300 | 801,000 | +734,300 | **1,530,437** |
| Y3 Q4 | 1,943,100 | 874,600 | +1,068,500 | **2,598,937** |
| **Y3 fin** | | | | **2,598,937** |

## 6.4 Indicateurs de Trésorerie

| Indicateur | Y1 | Y2 | Y3 |
|------------|-----|-----|-----|
| **Tréso début** | 400,000 € | 239,477 € | 249,837 € |
| **Tréso fin** | 239,477 € | 249,837 € | 2,598,937 € |
| **Variation** | -160,523 € | +10,360 € | +2,349,100 € |
| **Runway (mois)** | 18 mois | 8 mois | >24 mois |
| **Point mort mensuel** | M12 | M15 (cumulé) | - |

---

# 7. ANALYSE DE SENSIBILITÉ

## 7.1 Scénarios de Revenus

### Scénario Pessimiste (-30%)

| Métrique | Y1 | Y2 | Y3 |
|----------|-----|-----|-----|
| Revenus | 77,463 € | 651,252 € | 3,705,415 € |
| Charges | 271,185 € | 920,000 € | 2,944,350 € |
| Résultat | -193,722 € | -268,748 € | +761,065 € |
| **Cumul 3 ans** | | | **+298,595 €** |

**Impact** : Break-even repoussé à Y3 Q2. Besoin de financement additionnel en Y2.

### Scénario Optimiste (+30%)

| Métrique | Y1 | Y2 | Y3 |
|----------|-----|-----|-----|
| Revenus | 143,861 € | 1,209,468 € | 6,881,485 € |
| Charges | 285,000 € | 1,000,000 € | 3,200,000 € |
| Résultat | -141,139 € | +209,468 € | +3,681,485 € |
| **Cumul 3 ans** | | | **+3,749,814 €** |

**Impact** : Rentabilité dès Y2. Possibilité de croître plus vite ou lever moins.

## 7.2 Sensibilité aux Hypothèses Clés

### Impact du Churn

| Churn mensuel | LTV | Revenus Y3 | Résultat Y3 |
|---------------|-----|------------|-------------|
| 2% (-1pt) | 1,450 € | +20% | +800K € |
| **3% (base)** | **1,000 €** | **Base** | **Base** |
| 4% (+1pt) | 750 € | -15% | -400K € |
| 5% (+2pt) | 580 € | -25% | -700K € |

### Impact du CAC

| CAC | LTV/CAC | Profit Y3 |
|-----|---------|-----------|
| 40 € (-20€) | 25x | +500K € |
| **60 € (base)** | **16.7x** | **Base** |
| 80 € (+20€) | 12.5x | -300K € |
| 100 € (+40€) | 10x | -500K € |

### Impact du Prix

| Prix Pro | Revenus Y3 | Marge |
|----------|------------|-------|
| 24 € (-17%) | -17% | -800K € |
| **29 € (base)** | **Base** | **Base** |
| 35 € (+21%) | +21% | +1.1M € |
| 39 € (+34%) | +34% | +1.8M € |

## 7.3 Stress Tests

### Scénario : OpenAI augmente ses prix de 100%

| Impact | Montant Y3 |
|--------|------------|
| Coût API actuel | 351,750 € |
| Coût API +100% | 703,500 € |
| Impact sur résultat | -351,750 € |
| Résultat ajusté | +1,997,350 € |

**Conclusion** : Reste profitable. Mitigation : bascule vers Gemini Flash ou Ollama.

### Scénario : Croissance divisée par 2

| Métrique | Base Y3 | Divisé par 2 |
|----------|---------|--------------|
| Clients payants | 12,550 | 6,275 |
| Revenus | 5.29M € | 2.65M € |
| Charges ajustées | 2.94M € | 2.00M € |
| Résultat | +2.35M € | +650K € |

**Conclusion** : Reste profitable grâce à l'ajustement des charges (équipe réduite).

---

# 8. INDICATEURS FINANCIERS

## 8.1 Ratios de Performance

| Ratio | Y1 | Y2 | Y3 | Objectif SaaS |
|-------|-----|-----|-----|---------------|
| **Marge brute** | 75% | 80% | 85% | >70% ✅ |
| **Marge nette** | -145% | +1% | +44% | >20% ✅ (Y3) |
| **LTV/CAC** | 2.3x | 9.1x | 16.7x | >3x ✅ |
| **Magic Number** | 0.2 | 0.7 | 1.2 | >0.75 ✅ (Y2+) |
| **Rule of 40** | -105% | +740% | +468% | >40% ✅ (Y2+) |
| **Net Revenue Retention** | 95% | 105% | 115% | >100% ✅ |
| **Payback (mois)** | 5.2 | 2.2 | 1.7 | <12 ✅ |

## 8.2 Métriques SaaS Clés

### Évolution MRR

| Mois | MRR | Croissance MoM |
|------|-----|----------------|
| M6 | 6,117 € | - |
| M12 | 24,990 € | +15% |
| M18 | 65,000 € | +12% |
| M24 | 120,000 € | +10% |
| M30 | 280,000 € | +10% |
| M36 | 525,000 € | +8% |

### Composition ARR (fin Y3)

| Segment | ARR | % | Clients |
|---------|-----|---|---------|
| Pro | 3,654,000 € | 58% | 10,500 |
| Team | 2,138,400 € | 34% | 1,800 |
| Enterprise | 1,500,000 € | 24% | 250 |
| **Total** | **6,300,000 €** | 100% | **12,550** |

## 8.3 Valorisation Indicative

### Méthode des multiples

| Méthode | Multiple | Valeur Y3 |
|---------|----------|-----------|
| ARR × 8x (bas) | 8x | 50.4M € |
| ARR × 10x (médian) | 10x | 63.0M € |
| ARR × 12x (haut) | 12x | 75.6M € |
| Revenus × 6x | 6x | 31.8M € |
| **Fourchette** | | **50-76M €** |

### Comparables

| Comparable | Multiple ARR | Justification |
|------------|--------------|---------------|
| Notion (2024) | 12x | Croissance forte |
| Jasper (2023) | 8x | B2B SaaS AI |
| Otter.ai | 10x | AI productivity |
| **Lucide (projection)** | **10x** | Croissance + différenciation |

---

# ANNEXES BUDGÉTAIRES

## A. Détail des Salaires par Poste

### Grille salariale (coût employeur)

| Poste | Brut annuel | Charges (45%) | **Coût total** |
|-------|-------------|---------------|----------------|
| CEO/Fondateur | 36,000 € | 16,200 € | **52,200 €** |
| CEO (Y2+) | 50,000 € | 22,500 € | **72,500 €** |
| CTO | 65,000 € | 29,250 € | **94,250 €** |
| Dev senior | 55,000 € | 24,750 € | **79,750 €** |
| Dev confirmé | 48,000 € | 21,600 € | **69,600 €** |
| Dev junior | 40,000 € | 18,000 € | **58,000 €** |
| Head of Sales | 60,000 € + var | 27,000 € | **87,000 €** + var |
| Account Executive | 45,000 € + var | 20,250 € | **65,250 €** + var |
| SDR | 32,000 € + var | 14,400 € | **46,400 €** + var |
| Head of Marketing | 55,000 € | 24,750 € | **79,750 €** |
| Growth Marketer | 42,000 € | 18,900 € | **60,900 €** |
| Content Manager | 38,000 € | 17,100 € | **55,100 €** |
| Head of CS | 48,000 € | 21,600 € | **69,600 €** |
| CSM | 35,000 € | 15,750 € | **50,750 €** |
| Office Manager | 35,000 € | 15,750 € | **50,750 €** |

## B. Détail des Coûts API par Provider

### Tarifs actuels (décembre 2024)

| Provider | Modèle | Input ($/1M tokens) | Output ($/1M tokens) |
|----------|--------|---------------------|----------------------|
| **OpenAI** | GPT-4o | 5.00 | 15.00 |
| | GPT-4o-mini | 0.15 | 0.60 |
| | GPT-4-turbo | 10.00 | 30.00 |
| **Anthropic** | Claude 3.5 Sonnet | 3.00 | 15.00 |
| | Claude 3 Haiku | 0.25 | 1.25 |
| **Google** | Gemini 1.5 Pro | 1.25 | 5.00 |
| | Gemini 1.5 Flash | 0.075 | 0.30 |
| **Deepgram** | Nova-2 | 0.0043$/sec | - |
| **Ollama** | Local | 0 | 0 |

### Mix de modèles prévu

| Usage | Modèle | % traffic | Coût/req |
|-------|--------|-----------|----------|
| Chat standard | GPT-4o-mini | 60% | ~0.02€ |
| Chat complexe | GPT-4o | 20% | ~0.15€ |
| Documents | Claude Sonnet | 15% | ~0.12€ |
| Transcription | Whisper/Deepgram | 5% | ~0.05€ |
| **Moyenne** | | 100% | **~0.05€/req** |

## C. Hypothèses de Croissance Détaillées

### Funnel d'acquisition

| Étape | Y1 | Y2 | Y3 |
|-------|-----|-----|-----|
| Visiteurs/mois | 50K | 200K | 800K |
| Taux inscription | 10% | 8% | 6% |
| Inscriptions/mois | 5K | 16K | 48K |
| Activation J7 | 30% | 40% | 50% |
| Activés/mois | 1.5K | 6.4K | 24K |
| Conversion free→paid | 10% | 12% | 15% |
| Nouveaux payants/mois | 150 | 768 | 3,600 |

### Cohortes de rétention

| Mois | Y1 | Y2 | Y3 |
|------|-----|-----|-----|
| M1 | 50% | 60% | 70% |
| M3 | 35% | 45% | 55% |
| M6 | 25% | 35% | 45% |
| M12 | 15% | 25% | 35% |

---

**Document préparé par** : Robespierre Ganro
**Date** : Décembre 2025
**Version** : 1.0
**Statut** : Confidentiel - Document de travail pour investisseurs

---

*Ce budget prévisionnel est basé sur des hypothèses raisonnables et des benchmarks sectoriels SaaS B2B. Les projections peuvent varier en fonction des conditions de marché et de l'exécution.*
