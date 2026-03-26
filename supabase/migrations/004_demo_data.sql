-- ============================================================
-- DỮ LIỆU THẬT - Công ty CP SX TM & DV Quảng Cáo Việt
-- Chạy sau 000_setup_complete.sql | Idempotent
--
-- Admin: admin@qcviet.vn / Admin@2026!
-- NV: hovaten@qcviet.vn / Hovaten@2026!
-- ============================================================

-- Helper function tạo auth user
create or replace function _ensure_user(
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
  v_lt_annual uuid;
begin
  -- ADMIN
  select id into v_admin_uid from auth.users where email = 'admin@qcviet.vn';
  if v_admin_uid is null then raise exception 'Chạy 000_setup_complete.sql trước.'; end if;

  -- AUTH USERS
  v_u2  := _ensure_user('tuongthibichlan@qcviet.vn',    'Tuongthibichlan@2026!',    'Tương Thị Bích Lan');
  v_u3  := _ensure_user('nguyenhoangyen@qcviet.vn',     'Nguyenhoangyen@2026!',     'Nguyễn Hoàng Yến');
  v_u4  := _ensure_user('laiphuocduc@qcviet.vn',        'Laiphuocduc@2026!',        'Lại Phước Đức');
  v_u5  := _ensure_user('vuanhtuan@qcviet.vn',          'Vuanhtuan@2026!',          'Vũ Anh Tuấn');
  v_u6  := _ensure_user('nhut@qcviet.vn',               'Nhut@2026!',               'Nhựt');
  v_u7  := _ensure_user('nguyenhoainam@qcviet.vn',      'Nguyenhoainam@2026!',      'Nguyễn Hoài Nam');
  v_u8  := _ensure_user('nguyenducha@qcviet.vn',        'Nguyenducha@2026!',        'Nguyễn Đức Hà');
  v_u9  := _ensure_user('hieu@qcviet.vn',               'Hieu@2026!',               'Hiếu');
  v_u10 := _ensure_user('kieuoanh@qcviet.vn',           'Kieuoanh@2026!',           'Kiều Oanh');
  v_u11 := _ensure_user('nguyenhienthaolinh@qcviet.vn', 'Nguyenhienthaolinh@2026!', 'Nguyễn Hiền Thảo Linh');
  v_u12 := _ensure_user('nguyentridung@qcviet.vn',      'Nguyentridung@2026!',      'Nguyễn Trí Dũng');
  v_u13 := _ensure_user('vominhtam@qcviet.vn',          'Vominhtam@2026!',          'Võ Minh Tâm');
  v_u14 := _ensure_user('ngonguyennhuquynh@qcviet.vn',  'Ngonguyennhuquynh@2026!',  'Ngô Nguyễn Như Quỳnh');
  v_u15 := _ensure_user('nguyenthanhtra@qcviet.vn',     'Nguyenthanhtra@2026!',     'Nguyễn Thanh Trà');
  v_u16 := _ensure_user('nguyenthiquynhmai@qcviet.vn',  'Nguyenthiquynhmai@2026!',  'Nguyễn Thị Quỳnh Mai');

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

  -- EMPLOYEES (lương nằm ở hợp đồng, không ở đây)
  select id into v_e1 from employees where employee_code = 'QCV001';
  if v_e1 is null then v_e1 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,position,status,hire_date) values
      (v_e1, v_admin_uid, 'QCV001', 'Nguyễn Đức Hiệp', 'admin@qcviet.vn', '1985-08-20', 'male', v_d_bgd, 'Giám đốc (CEO)', 'active', '2020-01-01');
  end if;
  select id into v_e2 from employees where employee_code = 'QCV002';
  if v_e2 is null then v_e2 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e2, v_u2, 'QCV002', 'Tương Thị Bích Lan', 'tuongthibichlan@qcviet.vn', '1995-06-15', 'female', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01');
  end if;
  select id into v_e3 from employees where employee_code = 'QCV003';
  if v_e3 is null then v_e3 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e3, v_u3, 'QCV003', 'Nguyễn Hoàng Yến', 'nguyenhoangyen@qcviet.vn', '1997-09-22', 'female', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01');
  end if;
  select id into v_e4 from employees where employee_code = 'QCV004';
  if v_e4 is null then v_e4 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e4, v_u4, 'QCV004', 'Lại Phước Đức', 'laiphuocduc@qcviet.vn', '1994-11-03', 'male', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01');
  end if;
  select id into v_e5 from employees where employee_code = 'QCV005';
  if v_e5 is null then v_e5 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e5, v_u5, 'QCV005', 'Vũ Anh Tuấn', 'vuanhtuan@qcviet.vn', '1993-04-18', 'male', v_d_sale, v_e1, 'Nhân viên SALE', 'active', '2022-01-01');
  end if;
  select id into v_e6 from employees where employee_code = 'QCV006';
  if v_e6 is null then v_e6 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e6, v_u6, 'QCV006', 'Nhựt', 'nhut@qcviet.vn', '2000-02-25', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2023-01-01');
  end if;
  select id into v_e7 from employees where employee_code = 'QCV007';
  if v_e7 is null then v_e7 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e7, v_u7, 'QCV007', 'Nguyễn Hoài Nam', 'nguyenhoainam@qcviet.vn', '1996-07-10', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2022-01-01');
  end if;
  select id into v_e8 from employees where employee_code = 'QCV008';
  if v_e8 is null then v_e8 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e8, v_u8, 'QCV008', 'Nguyễn Đức Hà', 'nguyenducha@qcviet.vn', '1991-01-28', 'male', v_d_sx, v_e1, 'Kỹ thuật SX', 'active', '2022-01-01');
  end if;
  select id into v_e9 from employees where employee_code = 'QCV009';
  if v_e9 is null then v_e9 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e9, v_u9, 'QCV009', 'Hiếu', 'hieu@qcviet.vn', '2001-05-14', 'male', v_d_sx, v_e1, 'Công nhân SX', 'active', '2025-07-01');
  end if;
  select id into v_e10 from employees where employee_code = 'QCV010';
  if v_e10 is null then v_e10 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e10, v_u10, 'QCV010', 'Kiều Oanh', 'kieuoanh@qcviet.vn', '2002-12-30', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-12-26');
  end if;
  select id into v_e11 from employees where employee_code = 'QCV011';
  if v_e11 is null then v_e11 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e11, v_u11, 'QCV011', 'Nguyễn Hiền Thảo Linh', 'nguyenhienthaolinh@qcviet.vn', '1999-03-08', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2022-01-01');
  end if;
  select id into v_e12 from employees where employee_code = 'QCV012';
  if v_e12 is null then v_e12 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e12, v_u12, 'QCV012', 'Nguyễn Trí Dũng', 'nguyentridung@qcviet.vn', '2003-08-12', 'male', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2022-01-01');
  end if;
  select id into v_e13 from employees where employee_code = 'QCV013';
  if v_e13 is null then v_e13 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e13, v_u13, 'QCV013', 'Võ Minh Tâm', 'vominhtam@qcviet.vn', '1998-10-20', 'male', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-06-01');
  end if;
  select id into v_e14 from employees where employee_code = 'QCV014';
  if v_e14 is null then v_e14 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e14, v_u14, 'QCV014', 'Ngô Nguyễn Như Quỳnh', 'ngonguyennhuquynh@qcviet.vn', '2000-11-05', 'female', v_d_mkt, v_e1, 'Nhân viên MAR', 'active', '2025-08-01');
  end if;
  select id into v_e15 from employees where employee_code = 'QCV015';
  if v_e15 is null then v_e15 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e15, v_u15, 'QCV015', 'Nguyễn Thanh Trà', 'nguyenthanhtra@qcviet.vn', '1997-06-19', 'female', v_d_kt, v_e1, 'Kế toán', 'active', '2025-06-01');
  end if;
  select id into v_e16 from employees where employee_code = 'QCV016';
  if v_e16 is null then v_e16 := gen_random_uuid();
    insert into employees (id,user_id,employee_code,full_name,email,date_of_birth,gender,department_id,manager_id,position,status,hire_date) values
      (v_e16, v_u16, 'QCV016', 'Nguyễn Thị Quỳnh Mai', 'nguyenthiquynhmai@qcviet.vn', '1998-03-27', 'female', v_d_sx, v_e1, 'Nhân viên SX', 'active', '2025-07-01');
  end if;

  -- Gán manager BGĐ
  update departments set manager_id = v_e1 where code = 'BGD' and manager_id is null;

  -- LEAVE ALLOCATIONS (nghỉ phép năm 2026, mỗi NV 12 ngày, used = 0)
  select id into v_lt_annual from leave_types where code = 'ANNUAL';
  insert into leave_allocations (employee_id, leave_type_id, year, total_days, used_days) values
    (v_e2,v_lt_annual,2026,12,0),(v_e3,v_lt_annual,2026,12,0),
    (v_e4,v_lt_annual,2026,12,0),(v_e5,v_lt_annual,2026,12,0),
    (v_e6,v_lt_annual,2026,12,0),(v_e7,v_lt_annual,2026,12,0),
    (v_e8,v_lt_annual,2026,12,0),(v_e9,v_lt_annual,2026,12,0),
    (v_e10,v_lt_annual,2026,12,0),(v_e11,v_lt_annual,2026,12,0),
    (v_e12,v_lt_annual,2026,12,0),(v_e13,v_lt_annual,2026,12,0),
    (v_e14,v_lt_annual,2026,12,0),(v_e15,v_lt_annual,2026,12,0),
    (v_e16,v_lt_annual,2026,12,0)
  on conflict (employee_id, leave_type_id, year) do nothing;

  raise notice '✅ 16 nhân viên, 5 phòng ban, leave allocations 2026';
end $$;

-- Dọn helper
drop function if exists _ensure_user;
