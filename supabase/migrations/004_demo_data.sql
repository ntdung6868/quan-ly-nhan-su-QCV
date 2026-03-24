-- ============================================================
-- DỮ LIỆU DEMO - Công ty CP SX TM & DV Quảng Cáo Việt
-- Chạy sau 000_setup_complete.sql | Idempotent
--
-- Admin: admin@qcviet.vn / Admin@2026!
-- NV: hovaten@qcviet.vn / Hovaten@2026!
-- VD: Nguyễn Trí Dũng → nguyentridung@qcviet.vn / Nguyentridung@2026!
-- ============================================================

-- Helper function tạo auth user (dùng xong sẽ drop)
create or replace function _demo_ensure_user(
  p_email text, p_pass text, p_name text
) returns uuid as $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where email = p_email;
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    values (v_uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',p_email,crypt(p_pass,gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name',p_name),now(),now(),'','','','');
    insert into auth.identities (id,user_id,provider_id,provider,identity_data,created_at,updated_at,last_sign_in_at)
    values (gen_random_uuid(),v_uid,p_email,'email',jsonb_build_object('sub',v_uid::text,'email',p_email,'email_verified',true),now(),now(),now());
  end if;
  return v_uid;
end;
$$ language plpgsql security definer;

do $$
declare
  v_admin_uid uuid;
  v_u2 uuid; v_u3 uuid; v_u4 uuid; v_u5 uuid; v_u6 uuid; v_u7 uuid; v_u8 uuid;
  v_u9 uuid; v_u10 uuid; v_u11 uuid; v_u12 uuid; v_u13 uuid; v_u14 uuid; v_u15 uuid; v_u16 uuid;
  v_e1 uuid; v_e2 uuid; v_e3 uuid; v_e4 uuid; v_e5 uuid; v_e6 uuid; v_e7 uuid; v_e8 uuid;
  v_e9 uuid; v_e10 uuid; v_e11 uuid; v_e12 uuid; v_e13 uuid; v_e14 uuid; v_e15 uuid; v_e16 uuid;
  v_d_bgd uuid; v_d_sale uuid; v_d_sx uuid; v_d_mkt uuid; v_d_kt uuid;
  v_lt_annual uuid; v_lt_unpaid uuid;
begin
  -- ADMIN
  select id into v_admin_uid from auth.users where email = 'admin@qcviet.vn';
  if v_admin_uid is null then raise exception 'Chạy 000_setup_complete.sql trước.'; end if;

  -- AUTH USERS (hovaten@qcviet.vn / Hovaten@2026!)
  v_u2  := _demo_ensure_user('tuongthibichlan@qcviet.vn',    'Tuongthibichlan@2026!',    'Tương Thị Bích Lan');
  v_u3  := _demo_ensure_user('nguyenhoangyen@qcviet.vn',     'Nguyenhoangyen@2026!',     'Nguyễn Hoàng Yến');
  v_u4  := _demo_ensure_user('laiphuocduc@qcviet.vn',        'Laiphuocduc@2026!',        'Lại Phước Đức');
  v_u5  := _demo_ensure_user('vuanhtuan@qcviet.vn',          'Vuanhtuan@2026!',          'Vũ Anh Tuấn');
  v_u6  := _demo_ensure_user('nhut@qcviet.vn',               'Nhut@2026!',               'Nhựt');
  v_u7  := _demo_ensure_user('nguyenhoainam@qcviet.vn',      'Nguyenhoainam@2026!',      'Nguyễn Hoài Nam');
  v_u8  := _demo_ensure_user('nguyenducha@qcviet.vn',        'Nguyenducha@2026!',        'Nguyễn Đức Hà');
  v_u9  := _demo_ensure_user('hieu@qcviet.vn',               'Hieu@2026!',               'Hiếu');
  v_u10 := _demo_ensure_user('kieuoanh@qcviet.vn',           'Kieuoanh@2026!',           'Kiều Oanh');
  v_u11 := _demo_ensure_user('nguyenhienthaolinh@qcviet.vn', 'Nguyenhienthaolinh@2026!', 'Nguyễn Hiền Thảo Linh');
  v_u12 := _demo_ensure_user('nguyentridung@qcviet.vn',      'Nguyentridung@2026!',      'Nguyễn Trí Dũng');
  v_u13 := _demo_ensure_user('vominhtam@qcviet.vn',          'Vominhtam@2026!',          'Võ Minh Tâm');
  v_u14 := _demo_ensure_user('ngonguyennhuquynh@qcviet.vn',  'Ngonguyennhuquynh@2026!',  'Ngô Nguyễn Như Quỳnh');
  v_u15 := _demo_ensure_user('nguyenthanhtra@qcviet.vn',     'Nguyenthanhtra@2026!',     'Nguyễn Thanh Trà');
  v_u16 := _demo_ensure_user('nguyenthiquynhmai@qcviet.vn',  'Nguyenthiquynhmai@2026!',  'Nguyễn Thị Quỳnh Mai');

  -- PROFILES
  insert into profiles (id, email, full_name, role) values
    (v_u2,  'tuongthibichlan@qcviet.vn',    'Tương Thị Bích Lan',      'employee'),
    (v_u3,  'nguyenhoangyen@qcviet.vn',     'Nguyễn Hoàng Yến',        'employee'),
    (v_u4,  'laiphuocduc@qcviet.vn',        'Lại Phước Đức',            'employee'),
    (v_u5,  'vuanhtuan@qcviet.vn',          'Vũ Anh Tuấn',             'employee'),
    (v_u6,  'nhut@qcviet.vn',               'Nhựt',                     'employee'),
    (v_u7,  'nguyenhoainam@qcviet.vn',      'Nguyễn Hoài Nam',          'employee'),
    (v_u8,  'nguyenducha@qcviet.vn',        'Nguyễn Đức Hà',            'employee'),
    (v_u9,  'hieu@qcviet.vn',               'Hiếu',                     'employee'),
    (v_u10, 'kieuoanh@qcviet.vn',           'Kiều Oanh',                'employee'),
    (v_u11, 'nguyenhienthaolinh@qcviet.vn', 'Nguyễn Hiền Thảo Linh',   'employee'),
    (v_u12, 'nguyentridung@qcviet.vn',      'Nguyễn Trí Dũng',         'employee'),
    (v_u13, 'vominhtam@qcviet.vn',          'Võ Minh Tâm',             'employee'),
    (v_u14, 'ngonguyennhuquynh@qcviet.vn',  'Ngô Nguyễn Như Quỳnh',    'employee'),
    (v_u15, 'nguyenthanhtra@qcviet.vn',     'Nguyễn Thanh Trà',        'employee'),
    (v_u16, 'nguyenthiquynhmai@qcviet.vn',  'Nguyễn Thị Quỳnh Mai',    'employee')
  on conflict (id) do nothing;

  -- DEPARTMENTS
  insert into departments (id,name,code,description) values (gen_random_uuid(),'Ban Giám đốc','BGD','Điều hành công ty') on conflict (code) do nothing;
  select id into v_d_bgd from departments where code = 'BGD';
  insert into departments (id,name,code,description) values (gen_random_uuid(),'Phòng Kinh doanh (SALE)','SALE','Bán hàng và phát triển khách hàng') on conflict (code) do nothing;
  select id into v_d_sale from departments where code = 'SALE';
  insert into departments (id,name,code,description) values (gen_random_uuid(),'Phòng Sản xuất','SX','Sản xuất quảng cáo') on conflict (code) do nothing;
  select id into v_d_sx from departments where code = 'SX';
  insert into departments (id,name,code,description) values (gen_random_uuid(),'Phòng Marketing','MKT','Truyền thông, quảng cáo') on conflict (code) do nothing;
  select id into v_d_mkt from departments where code = 'MKT';
  insert into departments (id,name,code,description) values (gen_random_uuid(),'Phòng Kế toán','KT','Kế toán, tài chính') on conflict (code) do nothing;
  select id into v_d_kt from departments where code = 'KT';

  -- EMPLOYEES
  select id into v_e1 from employees where employee_code = 'QCV001';
  if v_e1 is null then v_e1 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,position,status,hire_date,base_salary) values
      (v_e1, v_admin_uid, 'QCV001', 'Nguyễn Đức Hiệp', 'admin@qcviet.vn', '1985-08-20', 'male', v_d_bgd, 'Giám đốc (CEO)', 'active', '2020-01-01', 0);
  end if;
  select id into v_e2 from employees where employee_code = 'QCV002';
  if v_e2 is null then v_e2 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e2, v_u2, 'QCV002', 'Tương Thị Bích Lan', 'tuongthibichlan@qcviet.vn', '1995-06-15', 'female', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01', 10300000);
  end if;
  select id into v_e3 from employees where employee_code = 'QCV003';
  if v_e3 is null then v_e3 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e3, v_u3, 'QCV003', 'Nguyễn Hoàng Yến', 'nguyenhoangyen@qcviet.vn', '1997-09-22', 'female', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01', 7000000);
  end if;
  select id into v_e4 from employees where employee_code = 'QCV004';
  if v_e4 is null then v_e4 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e4, v_u4, 'QCV004', 'Lại Phước Đức', 'laiphuocduc@qcviet.vn', '1994-11-03', 'male', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01', 8500000);
  end if;
  select id into v_e5 from employees where employee_code = 'QCV005';
  if v_e5 is null then v_e5 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e5, v_u5, 'QCV005', 'Vũ Anh Tuấn', 'vuanhtuan@qcviet.vn', '1993-04-18', 'male', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01', 9000000);
  end if;
  select id into v_e6 from employees where employee_code = 'QCV006';
  if v_e6 is null then v_e6 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e6, v_u6, 'QCV006', 'Nhựt', 'nhut@qcviet.vn', '2000-02-25', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2023-01-01', 5000000);
  end if;
  select id into v_e7 from employees where employee_code = 'QCV007';
  if v_e7 is null then v_e7 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e7, v_u7, 'QCV007', 'Nguyễn Hoài Nam', 'nguyenhoainam@qcviet.vn', '1996-07-10', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2022-01-01', 6000000);
  end if;
  select id into v_e8 from employees where employee_code = 'QCV008';
  if v_e8 is null then v_e8 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e8, v_u8, 'QCV008', 'Nguyễn Đức Hà', 'nguyenducha@qcviet.vn', '1991-01-28', 'male', v_d_sx, v_e1, 'Kỹ thuật SX', 'active', '2022-01-01', 8200000);
  end if;
  select id into v_e9 from employees where employee_code = 'QCV009';
  if v_e9 is null then v_e9 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e9, v_u9, 'QCV009', 'Hiếu', 'hieu@qcviet.vn', '2001-05-14', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2025-07-01', 6000000);
  end if;
  select id into v_e10 from employees where employee_code = 'QCV010';
  if v_e10 is null then v_e10 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e10, v_u10, 'QCV010', 'Kiều Oanh', 'kieuoanh@qcviet.vn', '2002-12-30', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-12-26', 3000000);
  end if;
  select id into v_e11 from employees where employee_code = 'QCV011';
  if v_e11 is null then v_e11 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e11, v_u11, 'QCV011', 'Nguyễn Hiền Thảo Linh', 'nguyenhienthaolinh@qcviet.vn', '1999-03-08', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2022-01-01', 8500000);
  end if;
  select id into v_e12 from employees where employee_code = 'QCV012';
  if v_e12 is null then v_e12 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e12, v_u12, 'QCV012', 'Nguyễn Trí Dũng', 'nguyentridung@qcviet.vn', '2003-08-12', 'male', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2022-01-01', 9000000);
  end if;
  select id into v_e13 from employees where employee_code = 'QCV013';
  if v_e13 is null then v_e13 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e13, v_u13, 'QCV013', 'Võ Minh Tâm', 'vominhtam@qcviet.vn', '1998-10-20', 'male', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-06-01', 8500000);
  end if;
  select id into v_e14 from employees where employee_code = 'QCV014';
  if v_e14 is null then v_e14 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e14, v_u14, 'QCV014', 'Ngô Nguyễn Như Quỳnh', 'ngonguyennhuquynh@qcviet.vn', '2000-11-05', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-08-01', 6500000);
  end if;
  select id into v_e15 from employees where employee_code = 'QCV015';
  if v_e15 is null then v_e15 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e15, v_u15, 'QCV015', 'Nguyễn Thanh Trà', 'nguyenthanhtra@qcviet.vn', '1997-06-19', 'female', v_d_kt, v_e1, 'Kế toán', 'active', '2025-06-01', 8000000);
  end if;
  select id into v_e16 from employees where employee_code = 'QCV016';
  if v_e16 is null then v_e16 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date,base_salary) values
      (v_e16, v_u16, 'QCV016', 'Nguyễn Thị Quỳnh Mai', 'nguyenthiquynhmai@qcviet.vn', '1998-03-27', 'female', v_d_sx, v_e1, 'Nhân viên SX', 'active', '2025-07-01', 6000000);
  end if;

  update departments set manager_id = v_e1 where code = 'BGD' and manager_id is null;

  -- CONTRACTS
  insert into contracts (employee_id, contract_number, type, start_date, end_date, base_salary, status, notes) values
    (v_e1,  'HD-2020-001', 'full_time', '2020-01-01', null,         0,        'active', 'Giám đốc'),
    (v_e2,  'HD-2022-002', 'full_time', '2022-01-01', '2025-12-31', 10300000, 'active', 'HĐ 4 năm'),
    (v_e3,  'HD-2022-003', 'full_time', '2022-01-01', '2025-12-31', 7000000,  'active', 'HĐ 4 năm'),
    (v_e4,  'HD-2022-004', 'full_time', '2022-01-01', '2025-12-31', 8500000,  'active', 'HĐ 4 năm'),
    (v_e5,  'HD-2022-005', 'full_time', '2022-01-01', '2025-12-31', 9000000,  'active', 'HĐ 4 năm'),
    (v_e6,  'HD-2023-006', 'full_time', '2023-01-01', '2026-12-31', 5000000,  'active', 'HĐ 4 năm'),
    (v_e7,  'HD-2022-007', 'full_time', '2022-01-01', '2025-12-31', 6000000,  'active', 'HĐ 4 năm'),
    (v_e8,  'HD-2022-008', 'full_time', '2022-01-01', '2025-12-31', 8200000,  'active', 'HĐ 4 năm'),
    (v_e9,  'HD-2025-009', 'full_time', '2025-09-01', '2028-08-31', 6000000,  'active', 'Chính thức'),
    (v_e10, 'HD-2026-010', 'full_time', '2026-02-26', '2029-02-25', 3000000,  'active', 'Chính thức'),
    (v_e11, 'HD-2022-011', 'full_time', '2022-01-01', '2025-12-31', 8500000,  'active', 'HĐ 4 năm'),
    (v_e12, 'HD-2022-012', 'full_time', '2022-01-01', '2025-12-31', 9000000,  'active', 'HĐ 4 năm'),
    (v_e13, 'HD-2025-013', 'full_time', '2025-06-01', '2028-05-31', 8500000,  'active', 'HĐ 3 năm'),
    (v_e14, 'HD-2025-014', 'full_time', '2025-08-01', '2028-07-31', 6500000,  'active', 'HĐ 3 năm'),
    (v_e15, 'HD-2025-015', 'full_time', '2025-06-01', '2028-05-31', 8000000,  'active', 'HĐ 3 năm'),
    (v_e16, 'HD-2025-016', 'full_time', '2025-07-01', '2028-06-30', 6000000,  'active', 'HĐ 3 năm')
  on conflict (contract_number) do nothing;

  -- LEAVE ALLOCATIONS
  select id into v_lt_annual from leave_types where code = 'ANNUAL';
  select id into v_lt_unpaid from leave_types where code = 'UNPAID';

  insert into leave_allocations (employee_id, leave_type_id, year, total_days, used_days) values
    (v_e2,v_lt_annual,2026,12,2),(v_e3,v_lt_annual,2026,12,1),
    (v_e4,v_lt_annual,2026,12,3),(v_e5,v_lt_annual,2026,12,1),(v_e6,v_lt_annual,2026,12,0),
    (v_e7,v_lt_annual,2026,12,2),(v_e8,v_lt_annual,2026,12,1),(v_e9,v_lt_annual,2026,12,0),
    (v_e10,v_lt_annual,2026,12,0),(v_e11,v_lt_annual,2026,12,1),(v_e12,v_lt_annual,2026,12,0),
    (v_e13,v_lt_annual,2026,12,2),(v_e14,v_lt_annual,2026,12,1),(v_e15,v_lt_annual,2026,12,1),
    (v_e16,v_lt_annual,2026,12,0)
  on conflict (employee_id, leave_type_id, year) do nothing;

  -- LEAVES
  if not exists (select 1 from leaves limit 1) then
    insert into leaves (employee_id, leave_type_id, start_date, end_date, days, reason, status, approved_by, approved_at) values
      (v_e2,v_lt_annual,'2026-01-20','2026-01-21',2,'Việc gia đình','approved',v_e1,'2026-01-15'),
      (v_e3,v_lt_annual,'2026-02-24','2026-02-24',1,'Khám bệnh','approved',v_e1,'2026-02-20'),
      (v_e4,v_lt_annual,'2026-01-12','2026-01-14',3,'Du lịch','approved',v_e1,'2026-01-08'),
      (v_e5,v_lt_annual,'2026-03-09','2026-03-09',1,'Việc cá nhân','approved',v_e1,'2026-03-05'),
      (v_e7,v_lt_unpaid,'2026-02-03','2026-02-04',2,'Bị cảm sốt','approved',v_e1,'2026-02-03'),
      (v_e7,v_lt_annual,'2026-03-16','2026-03-17',2,'Đám cưới bạn','approved',v_e1,'2026-03-10'),
      (v_e8,v_lt_annual,'2026-03-20','2026-03-20',1,'Việc riêng','approved',v_e1,'2026-03-18'),
      (v_e11,v_lt_unpaid,'2026-01-27','2026-01-27',1,'Đau bụng','approved',v_e1,'2026-01-27'),
      (v_e11,v_lt_annual,'2026-03-06','2026-03-06',1,'Việc gia đình','approved',v_e1,'2026-03-04'),
      (v_e13,v_lt_annual,'2026-02-09','2026-02-10',2,'Du lịch Đà Lạt','approved',v_e1,'2026-02-05'),
      (v_e14,v_lt_annual,'2026-03-13','2026-03-13',1,'Khám sức khoẻ','approved',v_e1,'2026-03-10'),
      (v_e15,v_lt_annual,'2026-02-25','2026-02-25',1,'Họp phụ huynh','approved',v_e1,'2026-02-23'),
      (v_e2,v_lt_annual,'2026-03-31','2026-03-31',1,'Việc cá nhân','pending',null,null),
      (v_e9,v_lt_annual,'2026-04-01','2026-04-02',2,'Về quê','pending',null,null);
  end if;

  raise notice '✅ Phần 1: NV + phòng ban + contracts + leaves';
end $$;

-- ============================================================
-- PHẦN 2: AUTO-GENERATE ATTENDANCE T1-T3/2026
-- ============================================================
do $$
declare
  v_emp record;
  v_d date;
  v_start date := '2026-01-02';
  v_end date := '2026-03-24';
  v_dow int;
  v_ci_h int; v_ci_m int; v_co_h int; v_co_m int;
  v_work numeric(5,2); v_ot numeric(5,2); v_status text;
  v_ci timestamptz; v_co timestamptz;
begin
  if exists (select 1 from attendance limit 1) then return; end if;

  -- Bỏ qua admin (base_salary = 0, không cần chấm công)
  for v_emp in select id, hire_date from employees where status = 'active' and base_salary > 0 loop
    v_d := greatest(v_start, v_emp.hire_date);
    while v_d <= v_end loop
      v_dow := extract(dow from v_d)::int;
      if v_dow = 0 then v_d := v_d + 1; continue; end if;
      if exists (select 1 from holidays where date = v_d) then v_d := v_d + 1; continue; end if;
      if exists (select 1 from leaves where employee_id = v_emp.id and status = 'approved' and v_d between start_date and end_date) then v_d := v_d + 1; continue; end if;

      if random() < 0.03 then
        insert into attendance (employee_id, date, status) values (v_emp.id, v_d, 'absent') on conflict do nothing;
        v_d := v_d + 1; continue;
      end if;

      if random() < 0.7 then
        v_ci_h := 7 + (random() * 0.8)::int;
        v_ci_m := case when v_ci_h = 7 then 30 + (random() * 29)::int else (random() * 14)::int end;
        v_status := 'present';
      else
        v_ci_h := 8; v_ci_m := 16 + (random() * 44)::int;
        if v_ci_m >= 60 then v_ci_h := 9; v_ci_m := v_ci_m - 60; end if;
        v_status := 'late';
      end if;

      v_co_h := 17 + (random() * 1.5)::int;
      v_co_m := (random() * 59)::int;

      v_ci := (v_d || ' ' || lpad(v_ci_h::text,2,'0') || ':' || lpad(v_ci_m::text,2,'0') || ':00+07')::timestamptz;
      v_co := (v_d || ' ' || lpad(v_co_h::text,2,'0') || ':' || lpad(v_co_m::text,2,'0') || ':00+07')::timestamptz;
      v_work := round(extract(epoch from (v_co - v_ci)) / 3600.0, 2);
      v_ot := greatest(0, v_work - 8);

      insert into attendance (employee_id, date, check_in, check_out, status, work_hours, overtime_hours)
      values (v_emp.id, v_d, v_ci, v_co, v_status, v_work, v_ot) on conflict do nothing;

      v_d := v_d + 1;
    end loop;
  end loop;
  raise notice '✅ Phần 2: Attendance T1-T3/2026';
end $$;

-- ============================================================
-- PHẦN 3: PAYSLIPS T1-T2 (paid) + T3 (draft)
-- ============================================================
do $$
declare
  v_emp record; v_m int;
  v_actual int; v_ot numeric; v_base numeric;
  v_gross numeric; v_net numeric; v_ins numeric; v_tax numeric;
  v_status text; v_paid timestamptz;
begin
  if exists (select 1 from payslips limit 1) then return; end if;

  for v_emp in select id, base_salary from employees where status = 'active' and base_salary > 0 loop
    for v_m in 1..3 loop
      -- Ngày đi làm thực tế
      select count(*) filter (where status in ('present','late')),
             coalesce(sum(overtime_hours) filter (where status in ('present','late')), 0)
      into v_actual, v_ot
      from attendance where employee_id = v_emp.id and extract(month from date) = v_m and extract(year from date) = 2026;

      -- Cộng thêm ngày nghỉ phép CÓ LƯƠNG
      v_actual := v_actual + coalesce((
        select sum(l.days)
        from leaves l
        join leave_types lt on lt.id = l.leave_type_id
        where l.employee_id = v_emp.id
          and l.status = 'approved'
          and lt.is_paid = true
          and extract(month from l.start_date) = v_m
          and extract(year from l.start_date) = 2026
      ), 0);

      if v_actual = 0 then continue; end if;

      v_base := v_emp.base_salary;
      v_gross := round((v_base / 26.0) * least(v_actual, 26) + v_ot * (v_base / 26.0 / 8) * 1.5, 0);
      v_ins := round(v_base * 0.105, 0);
      v_tax := greatest(0, round((v_gross - v_ins - 11000000) * 0.1, 0));
      v_net := greatest(0, v_gross - v_ins - v_tax);

      if v_m <= 2 then v_status := 'paid'; v_paid := ('2026-' || lpad(v_m::text,2,'0') || '-28')::timestamptz;
      else v_status := 'draft'; v_paid := null; end if;

      insert into payslips (employee_id,month,year,base_salary,total_allowances,total_deductions,gross_salary,tax_amount,insurance_amount,net_salary,work_days,actual_work_days,overtime_hours,overtime_pay,status,paid_at)
      values (v_emp.id,v_m,2026,v_base,0,v_ins,v_gross,v_tax,v_ins,v_net,26,v_actual,v_ot,round(v_ot*(v_base/26.0/8)*1.5,0),v_status,v_paid)
      on conflict do nothing;
    end loop;
  end loop;
  raise notice '✅ Phần 3: Payslips T1-T3/2026';
end $$;

-- ============================================================
-- PHẦN 4: TASKS, ANNOUNCEMENTS, NOTIFICATIONS
-- ============================================================
do $$
declare
  v_e1 uuid; v_e2 uuid; v_e4 uuid; v_e8 uuid; v_e11 uuid; v_e12 uuid; v_e15 uuid;
  v_d_sale uuid; v_d_sx uuid; v_d_mkt uuid; v_d_kt uuid;
  v_admin_uid uuid;
begin
  select id into v_e1 from employees where employee_code = 'QCV001';
  select id into v_e2 from employees where employee_code = 'QCV002';
  select id into v_e4 from employees where employee_code = 'QCV004';
  select id into v_e8 from employees where employee_code = 'QCV008';
  select id into v_e11 from employees where employee_code = 'QCV011';
  select id into v_e12 from employees where employee_code = 'QCV012';
  select id into v_e15 from employees where employee_code = 'QCV015';
  select id into v_d_sale from departments where code = 'SALE';
  select id into v_d_sx from departments where code = 'SX';
  select id into v_d_mkt from departments where code = 'MKT';
  select id into v_d_kt from departments where code = 'KT';
  select id into v_admin_uid from auth.users where email = 'admin@qcviet.vn';

  if not exists (select 1 from tasks limit 1) then
    insert into tasks (title,description,status,priority,assigned_to,assigned_by,department_id,due_date) values
      ('Báo cáo doanh thu Q1','Tổng hợp báo cáo doanh thu quý 1/2026','in_progress','high',v_e2,v_e1,v_d_sale,'2026-03-28'),
      ('Cập nhật bảng giá 2026','Cập nhật bảng giá cho KH VIP','done','medium',v_e4,v_e1,v_d_sale,'2026-03-15'),
      ('Bảo trì máy CNC số 3','Bảo dưỡng định kỳ, thay dầu, kiểm tra dao cắt','in_progress','urgent',v_e8,v_e1,v_d_sx,'2026-03-25'),
      ('Chiến dịch FB Ads T4','Lên kế hoạch ads sản phẩm mới tháng 4','todo','high',v_e12,v_e1,v_d_mkt,'2026-04-01'),
      ('Thiết kế catalogue 2026','Catalogue sản phẩm cho SALE team','in_progress','medium',v_e11,v_e1,v_d_mkt,'2026-03-31'),
      ('Quyết toán thuế TNCN 2025','Hoàn thành quyết toán thuế cho NV','done','high',v_e15,v_e1,v_d_kt,'2026-03-20'),
      ('Kiểm tra lô hàng 52','Kiểm tra 100% sản phẩm trước xuất kho','todo','urgent',v_e8,v_e1,v_d_sx,'2026-03-26'),
      ('Tìm KH mới Q2','Liên hệ 20 KH tiềm năng tháng 4','todo','medium',v_e2,v_e1,v_d_sale,'2026-04-30');
  end if;

  if not exists (select 1 from announcements limit 1) then
    insert into announcements (title,content,created_by,is_pinned,expires_at) values
      ('Nghỉ lễ Giỗ Tổ Hùng Vương','Công ty nghỉ lễ 07/04/2026. NV được nghỉ 1 ngày có lương.',v_e1,true,'2026-04-08'),
      ('Team building Q2/2026','Dự kiến 15-16/04/2026 tại Vũng Tàu.',v_e1,true,'2026-04-17'),
      ('Quy định chấm công mới','Từ T3/2026, đến sau 8:15 tính đi trễ.',v_e1,false,'2026-06-30'),
      ('Sinh nhật tháng 3','Chúc mừng: Thảo Linh (08/03), Quỳnh Mai (27/03)!',v_e1,false,'2026-03-31');
  end if;

  if not exists (select 1 from notifications limit 1) then
    insert into notifications (user_id,title,message,type,is_read) values
      (v_admin_uid,'Đơn nghỉ phép mới','Bích Lan gửi đơn nghỉ 31/03','info',false),
      (v_admin_uid,'Nhắc tính lương','Lương T3/2026 cần tính trước 28/03','warning',false),
      (v_admin_uid,'Task sắp deadline','Bảo trì máy CNC hết hạn 25/03','warning',false);
  end if;

  raise notice '✅ Phần 4: Tasks + announcements + notifications';
end $$;

-- Dọn helper function
drop function if exists _demo_ensure_user;
