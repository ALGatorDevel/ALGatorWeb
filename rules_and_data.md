<!-- TOC -->

- [Uporabniške pravice (implicitna pravila)](#uporabniške-pravice-implicitna-pravila)
  - [ANONYMOUS vs DB mode](#anonymous-vs-db-mode)
  - [Skupine:](#skupine)
  - [Uporabniki](#uporabniki)
  - [ENTITETE](#entitete)
  - [Avtomatsko dodana pravila in entitete](#avtomatsko-dodana-pravila-in-entitete)
  - [CAN(uid, eid, right)](#canuid-eid-right)
- [Podatki na spletni strani](#podatki-na-spletni-strani)
  - [Osnovni podatki o projektu](#osnovni-podatki-o-projektu)
  - [Implementacija projekta](#implementacija-projekta)
  - [Presenterji in pogledi](#presenterji-in-pogledi)
  - [Uporabniške pravice](#uporabniške-pravice)

<!-- /TOC -->
<!-- /TOC -->
<!-- /TOC -->
<hr>

# Uporabniške pravice (implicitna pravila)

## ANONYMOUS vs DB mode
- ALGatorServer lahko teče v dveh načinih: ANONYMOUS in DB način. Prvi se uporablja lokalno (kadar ALGatorServer teče v dockerju), drugi se uporablja v produkciji
- ANONYMOUS način vplopim tako, da ustvarim datoteko "anonymous" na ALGATOR_ROOT PREDEN poženem ALGatorServer in ALGatorWeb
- v ANONYMOUS načinu ni prijave v spletno stran, omogočene so vse možnosti dodajanja in urejanja projektov; podatki o entitetah se pišejo samo na disk; 
  uporablja se baza sqllite (datoteka db.sqlite3) vendar samo za potrebe django strežnika, podatki o entitetah pa se v bazo ne shranjujejo
- v DB načinu se uporablja MySQL baza, uporabnik se mora prijaviti na spletno stran, dela pa lahko vse, kar mu dovoljujejo pravice (glej spodaj), 
  podatki o entitetah (lastništvo, pravice, ...) se zapisujejo v bazo


## Skupine:
 - vsak uporabnik je (implicitno) v skupini EVERYONE
   (posledica: vsi uporabniki imajo vse pravice, ki se nastavijo skupini EVERYONE)
 - neprijavljen uporabnik je (implicitno) v skupini ANONYMOUS
   (posledica: vsi neprijavljeni uporabniki imajo vse pravice, ki se nastavijo skupini ANONYMOUS)
 - root (is_superuser == true) in owner entitete imata nad njo vse pravice
 - privatno entiteto (is_private == true) vidita samo owner in root

## Uporabniki
- uporabnika "root" in "algator" imata is_superuser=true
- uporabnik  "root" ima  is_staff=true (lahko se prijavi v django admin page)
- uporabnika  "anonymous" in "task_client" sta neaktivna (is_active=false), v ta profil se ne da prijaviti

## ENTITETE
- entitete v sistemu (algoritmi, testne množice, presenterji) so urejene hierarhično; 
- vrh hierarhije je System (e0_S), ta vsebuje entiteto Projects (e0_P), ki je oče vseh problemov; 
  vsak problem (e_X) vsebuje entitete Algorithms (e_X_A), TestSets (e_X_T) in Presenters (e_X_R);
- pravice nad očetom v hierarhiji se podedujejo na otroke (primer: če ima nek uporabnik pravico can_write 
  nad projektom, ima to pravico avtomatsko tudi nad vsemi algoritmi, testnimi množicami in presenterji).
- POSLEDICA: owner projekta ima full control nad vsemi otroki!

## Avtomatsko dodana pravila in entitete
- za vsako dodan projekt se v skupino EVERYONE doda can_read in can_add_project
- za vsako entiteto se v skupino EVERYONE doda can_read
- uporabnik task_client ima pravice can_read in can_execute nae entiteto Projects 


## CAN(uid, eid, right)
- če ALGatorServer teče v ANONYMOUS načinu, can() vedno vrne true
- če ALGatorServer teče v DB načinu, can(uid, eid, right) vrne:
  - če (isEmpty(uid) || nonexisting(uid) || isEmpty(eid)) || nonexisting(right) --> false
  - če (nonexisting(eid))                                                       --> true
  - če je uid superuser ali če je uid owner entitete eid                        --> true
  - če je entiteta privatna                                                     --> false
  - če obstaja pravica v entitypermissionuser(uid, eeid) ali 
    entitypermissiongroup(gid, eeid),kjer je gid skupina, 
    kateri pripada uporabnik in eeid entiteta eid ali kateri 
    od njenih prednikov (parent)                                                --> true
  - sicer                                                                       --> false

opomba: nonexisting(eid) ... entiteta je na disku (v data_root), ni pa v bazi; 
  funkcionalnost je bila dodana za podporo ročnemu (neprodukcijkem) okolju; 
  v produkciji takih entitet (verjetno?) ne bo.



# Podatki na spletni strani

## Osnovni podatki o projektu
- ``isEditMode`` ... true, če je editMode vključen
- ``isDBMode`` ... true, če ALGator teče v DB načinu (torej uporablja bazo)

- ``current_user_id`` ... uid trenutno prijavljenega uporabnika
- ``current_user_is_superuser`` ... true, če je trenutno prijavljeni uporabnik superuser

- ime trenutnega projekta: ``projectName``
- eid trenutnega projekta: ``projectEID``
  
- vsi podatki (text) sekcij na strani "Problem overview" so v globalni spremenljivki ``projectDescJSON``projectDescJSON

- seznam z imeni presenterjev: ``projectPresenters``
- podatki o presenterjih: slovar ``presenterJSONs`` (ključ: ime presenterja, vrednost: json s podatki o presenterju)
- vsi pogledi (views), ki so prikazani na strani, so shranjeni v slovarju ``aLayout`` 

- seznam vseh računalnikov (ki so izvajali algoritme tega projekta): ``projectComputers``


## Implementacija projekta
- vsi podatki o projektu in njegovih entitetah so shranjeni v objektu ``pageProject``, 
  ki ima naslednje lastnosti:  ``generalData``, ``srcFiles``, ``parameters``, ``timers``, 
  ``indicators``, ``counters``, ``generators``, ``testsets``, ``algorithms``.
- vsi podatki (html besedilo) sekcij na strani "Problem Overview" so shranjeni v 
  ``pageProject.project_html_descriptions``
- podatki o družinah računalnikov, registriranih na strežniku, so shranjeni v ``pageProject.computerFamilies``

## Presenterji in pogledi
- vsi podatki o presenterjih so shranjeni v objektu ``pp``,
- seznam imen presenterjev: ``pp.projectPresenters``
- podatki o presenterjih: slovar ``pp.presenterJSONs`` (ključ: ime presenterja, vrednost: json s podatki o presenterju)

- vsi pogledi (views), ki so prikazani na strani, so shranjeni v slovarju ``aLayout`` 


## Uporabniške pravice
- podatki o uporabnikih in pravicah so shranjeni v objektu ``ausers``
- posamezne lastnosti objekta ausers se naložijo, ko jih potrebujem (na primer: ausers.groups se naloži le v primeru urejanja lastnosti Settings)
  
- pravice trenutnega uporabnika so shranjene v slovarju ``ausers.permissions``, kjer je za vsako entiteto sistema podana pravica trenutno prijavljenega uporabnika
- metoda can() za določitev pravic trenutno prijavljenega uporabnika uporablja ``ausers.permissions``; 


# Poganjanje testov in datoteke z rezultati

## Kdo lahko izvaja teste 
Teste nad (algoritem, testset) lahko poganja vsak, ki ima pravico can_execute nad algoritmom ali testsetom, to so (vsaj) superuser, taskclient in owner projekta, algoritma ali testseta.

## Kdo lahko spreminja status (cancel, pause, resume) taskov?
Status lahko spreminja superuser, task_client, owner projekta in owner tasks.

## Datoteke z rezultati
Aktualna datoteka z rezultati za (algoritem,testset, mtype) je **NAJNOVEJŠA** izmed datotek ``results\F.*\algoritem-testset.mtype``, kjer je F aktualna družina (EMExecFamily oziroma CNTExecFamily) za projekt. Če obstaja več datotek (ustvarjenih z računalniki izbrane družine F), so vse razen najnovejše zastarele (tudi če so kompletne, najnovejša pa ni). Rezultate zastarelih datotek se lahko uporabi le v poizvedbah, kjer eksplicitno navedem ComputerID.    