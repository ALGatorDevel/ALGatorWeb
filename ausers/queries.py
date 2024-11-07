PERMISSIONS_ENTTIES_USER_GROUP = ("(SELECT e.id as eid, epu.value as value, e.is_private as is_private, CONCAT('u: ', uu.username) as user_group, epu.user_id as id " 
                                  "FROM ausers_entitypermissionuser epu " 
                                  "LEFT JOIN ausers_entities e ON e.id = epu.entity_id " 
                                  "JOIN ausers_user uu ON uu.uid = epu.user_id " 
                                  "WHERE epu.user_id = %s) UNION " 
                                  "( SELECT e.id as eid, epg.value as value, e.is_private as is_private, CONCAT('g: ', g.name) as user_group, epg.group_id as id " 
                                  "FROM ausers_entitypermissiongroup epg " 
                                  "LEFT JOIN ausers_entities e ON e.id = epg.entity_id " 
                                  "JOIN ausers_group g ON g.id = epg.group_id " 
                                  "WHERE epg.group_id IN((SELECT DISTINCT group_id FROM ausers_group_user WHERE user_id = %s) UNION (SELECT DISTINCT group_id FROM ausers_group WHERE owner_id = %s)) ) ")


PERMISSIONS_ENTTIES_USER_GROUP_ROOT = ("(SELECT e.id as eid, epu.value as value, e.is_private as is_private, CONCAT('u: ', uu.username) as user_group, epu.user_id as id "
                                       "FROM ausers_entitypermissionuser epu " 
                                       "LEFT JOIN ausers_entities e ON e.id = epu.entity_id " 
                                       "JOIN ausers_user uu ON uu.uid = epu.user_id ) "
                                       "UNION " 
                                       "(SELECT e.id as eid, epg.value as value, e.is_private as is_private, CONCAT('g: ', g.name) as user_group, epg.group_id as id " 
                                       "FROM ausers_entitypermissiongroup epg " 
                                       "LEFT JOIN ausers_entities e ON e.id = epg.entity_id " 
                                       "JOIN ausers_group g ON g.id = epg.group_id ) ")
