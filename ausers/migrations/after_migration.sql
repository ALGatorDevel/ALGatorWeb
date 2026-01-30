USE algator;

ALTER TABLE ausers_entities CHANGE COLUMN is_private is_private BOOL NOT NULL DEFAULT TRUE;
-- in more recent versions of mysql (like 5.7) instead of "DROP CONSTRAINT" use "DROP FOREIGN KEY"
-- to get FOREIGN KEY name, use SHOW CREATE TABLE ausers_entities;

-- ALTER TABLE ausers_entities DROP FOREIGN KEY ausers_entities_parent_id_d8ac38f0_fk_ausers_entities_id;
ALTER TABLE ausers_entities DROP CONSTRAINT ausers_entities_parent_id_d8ac38f0_fk_ausers_entities_id;
ALTER TABLE ausers_entities ADD CONSTRAINT entiteta_omejitev FOREIGN KEY(parent_id) REFERENCES ausers_entities(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE ausers_entitypermissiongroup DROP FOREIGN KEY ausers_entitypermiss_entity_id_10a71473_fk_ausers_en;
ALTER TABLE ausers_entitypermissiongroup DROP CONSTRAINT ausers_entitypermiss_entity_id_10a71473_fk_ausers_en;
ALTER TABLE ausers_entitypermissiongroup ADD CONSTRAINT entiteta_omejitev_epg FOREIGN KEY(entity_id) REFERENCES ausers_entities(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE ausers_entitypermissionuser DROP FOREIGN KEY ausers_entitypermiss_entity_id_bfb0f749_fk_ausers_en;
ALTER TABLE ausers_entitypermissionuser DROP CONSTRAINT ausers_entitypermiss_entity_id_bfb0f749_fk_ausers_en;
ALTER TABLE ausers_entitypermissionuser ADD CONSTRAINT entiteta_omejitev_epu FOREIGN KEY(entity_id) REFERENCES ausers_entities(id) ON DELETE CASCADE ON UPDATE CASCADE;

DELIMITER //
CREATE PROCEDURE after_insert_project (IN eid VARCHAR(16), IN owner VARCHAR(16))
BEGIN
    INSERT INTO ausers_entities (id, name, is_private, entity_type_id, owner_id, parent_id) VALUES
      (CONCAT(eid,'_A'), 'Algorithms', 0, 'et0_A', owner, eid);
    INSERT INTO ausers_entities (id, name, is_private, entity_type_id, owner_id, parent_id) VALUES
      (CONCAT(eid,'_T'), 'Testsets',   0, 'et0_T', owner, eid);
    INSERT INTO ausers_entities (id, name, is_private, entity_type_id, owner_id, parent_id) VALUES
      (CONCAT(eid,'_R'), 'Presenters', 0, 'et0_R', owner, eid);
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER ADD_ENTITY_TRIGGER
AFTER INSERT ON ausers_entities
FOR EACH ROW
BEGIN
    DECLARE eid VARCHAR(16);
    DECLARE own VARCHAR(16);
    DECLARE et VARCHAR(16);

    SET eid := NEW.id;
    SET own := NEW.owner_id;
    SET et := (SELECT entity_type_id FROM ausers_entities WHERE id = eid);

    IF et = 'et1' THEN
  	    INSERT INTO ausers_entitypermissiongroup (group_id, entity_id, value) VALUES
        ('g2_ev26hedn7', eid, 17), -- everyone can_read & can_add_algorithm  to project
        ('g1_an15434hj', eid, 1);  -- anonymous can only read
    ELSEIF et IN('et2', 'et3', 'et4') THEN
  	    INSERT INTO ausers_entitypermissiongroup (group_id, entity_id, value) VALUES
        ('g2_ev26hedn7', eid, 1);  -- everyone can read every non-private entity 
    END IF;
END;//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE CASCADE_DELETE_USER1(IN uid VARCHAR(16))
BEGIN
    DECLARE eid VARCHAR(16);
    DECLARE done BOOL DEFAULT FALSE;

    DECLARE c1 CURSOR FOR SELECT id FROM ausers_entities WHERE owner_id = uid;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SET done = FALSE;
    OPEN c1;
    read_loop: LOOP
        FETCH c1 INTO eid;
        IF done THEN
            LEAVE read_loop;
        END IF;
        DELETE FROM ausers_entitypermissiongroup WHERE entity_id = eid;
		DELETE FROM ausers_entitypermissionuser WHERE entity_id = eid;
	END LOOP;
    CLOSE c1;
    DELETE FROM ausers_entities WHERE owner_id = uid;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE CASCADE_DELETE_USER2(IN uid VARCHAR(16))
BEGIN
    DECLARE gid VARCHAR(16);
    DECLARE done BOOL DEFAULT FALSE;

    DECLARE c1 CURSOR FOR SELECT id FROM ausers_group WHERE owner_id = uid;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SET done = FALSE;
    OPEN c1;
    read_loop: LOOP
        FETCH c1 INTO gid;
        IF done THEN
            LEAVE read_loop;
        END IF;
        DELETE FROM ausers_entitypermissiongroup WHERE group_id = gid;
        DELETE FROM ausers_group_user WHERE group_id = gid;
		DELETE FROM ausers_group WHERE id = gid;
	END LOOP;
    CLOSE c1;
    DELETE FROM ausers_group WHERE owner_id = uid;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE CASCADE_DELETE_USER(IN uid VARCHAR(16))
BEGIN
	DELETE FROM ausers_group_user WHERE user_id = uid;
    DELETE FROM ausers_entitypermissionuser WHERE user_id = uid;
    CALL CASCADE_DELETE_USER1(uid);
    CALL CASCADE_DELETE_USER2(uid);
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER REMOVE_USER_TRIGGER
BEFORE DELETE ON ausers_user
FOR EACH ROW
BEGIN
	DECLARE uid VARCHAR(16);
    SET uid := OLD.uid;-- (SELECT id FROM ausers_user WHERE user_id = OLD.id LIMIT 1);
    CALL CASCADE_DELETE_USER(uid);
    -- DELETE FROM ausers_user WHERE id = uid;
END;//
DELIMITER ;


DELIMITER //
CREATE TRIGGER REMOVE_GROUP_TRIGGER
BEFORE DELETE ON ausers_group
FOR EACH ROW
BEGIN
	DECLARE gid VARCHAR(16);
    SET gid := OLD.id;
    DELETE FROM ausers_group_user WHERE group_id = gid;
    DELETE FROM ausers_entitypermissiongroup WHERE group_id = gid;
END;//
DELIMITER ;