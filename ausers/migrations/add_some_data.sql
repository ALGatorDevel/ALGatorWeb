USE algator;

INSERT INTO ausers_user (`uid`, `owner`, `username`, `password`, `first_name`, `last_name`, `email`, `affiliation`, `address`, `country`, `is_superuser`, `is_staff`, `is_active`, `date_joined`, `last_login`) VALUES ('u_42', 'u0_ro0jpj4wp', 'U42', ' ', 'U', '42', 'U42@42.si', ' ', ' ', ' ', '0', '0', '1', '2024-01-01 00:00:00', '2024-01-01 00:00:00');
INSERT INTO ausers_user (`uid`, `owner`, `username`, `password`, `first_name`, `last_name`, `email`, `affiliation`, `address`, `country`, `is_superuser`, `is_staff`, `is_active`, `date_joined`, `last_login`) VALUES ('u_24', 'u_42',         'U24', ' ', 'U', '24', 'U24@24.si', ' ', ' ', ' ', '0', '0', '1', '2024-01-01 00:00:00', '2024-01-01 00:00:00');

INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_100', 'BasicSort',     '0', 'et1', 'u0_ro0jpj4wp', 'e0_P');
CALL after_insert_project('e_100', 'u0_ro0jpj4wp');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_101', 'QuickSort',     '0', 'et2', 'u0_ro0jpj4wp', 'e_100_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_102', 'BubbleSort',    '0', 'et2', 'u0_ro0jpj4wp', 'e_100_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_103', 'InsertionSort', '1', 'et2', 'u_42', 'e_100_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_104', 'JavaSort',      '0', 'et2', 'u_42', 'e_100_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_105', 'TestSet1',      '0', 'et3', 'u0_ro0jpj4wp', 'e_100_T');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_106', 'TestSet2',      '1', 'et3', 'u_24', 'e_100_T');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_107', 'TestSet3',      '0', 'et3', 'u_42', 'e_100_T');

INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_110', 'BasicMatrixMul','0', 'et1', 'u_42',          'e0_P');
CALL after_insert_project('e_110', 'u0_ro0jpj4wp');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_111', 'BasicMul',      '0', 'et2', 'u_42', 'e_110_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_112', 'Strassen',      '1', 'et2', 'u_42', 'e_110_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_113', 'Winograd',      '0', 'et2', 'u_24', 'e_110_A');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_114', 'TestSet0',      '0', 'et3', 'u_42', 'e_110_T');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_115', 'TestSet1',      '2', 'et3', 'u_24', 'e_110_T');
INSERT INTO ausers_entities (`id`, `name`, `is_private`, `entity_type_id`, `owner_id`, `parent_id`) VALUES ('e_116', 'TestSet2',      '0', 'et3', 'u_24', 'e_110_T');


