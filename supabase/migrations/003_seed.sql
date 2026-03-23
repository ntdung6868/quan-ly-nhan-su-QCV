-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert default shift
insert into shifts (name, start_time, end_time, break_minutes, working_days, is_default) values
('Ca hành chính', '08:00', '17:00', 60, '{1,2,3,4,5}', true),
('Ca sáng', '06:00', '14:00', 30, '{1,2,3,4,5,6}', false),
('Ca chiều', '14:00', '22:00', 30, '{1,2,3,4,5,6}', false);

-- Insert leave types
insert into leave_types (name, code, days_per_year, is_paid, description) values
('Nghỉ phép năm', 'ANNUAL', 12, true, 'Nghỉ phép hàng năm có lương'),
('Nghỉ ốm', 'SICK', 30, true, 'Nghỉ ốm có lương'),
('Nghỉ không lương', 'UNPAID', 0, false, 'Nghỉ không hưởng lương'),
('Nghỉ cưới', 'WEDDING', 3, true, 'Nghỉ kết hôn'),
('Nghỉ tang', 'FUNERAL', 3, true, 'Nghỉ có việc tang');

-- Insert default holidays 2026
insert into holidays (name, date, is_recurring) values
('Tết Dương lịch', '2026-01-01', true),
('Giỗ Tổ Hùng Vương', '2026-04-07', false),
('Ngày Giải phóng miền Nam', '2026-04-30', true),
('Ngày Quốc tế Lao động', '2026-05-01', true),
('Ngày Quốc khánh', '2026-09-02', true),
('Tết Nguyên Đán (30 Tết)', '2026-02-16', false),
('Tết Nguyên Đán (Mùng 1)', '2026-02-17', false),
('Tết Nguyên Đán (Mùng 2)', '2026-02-18', false),
('Tết Nguyên Đán (Mùng 3)', '2026-02-19', false),
('Tết Nguyên Đán (Mùng 4)', '2026-02-20', false),
('Tết Nguyên Đán (Mùng 5)', '2026-02-21', false);

-- Insert allowances
insert into allowances (name, code, amount, is_taxable, description) values
('Phụ cấp ăn trưa', 'LUNCH', 730000, false, 'Phụ cấp ăn trưa hàng tháng'),
('Phụ cấp xăng xe', 'TRANSPORT', 500000, false, 'Phụ cấp đi lại'),
('Phụ cấp điện thoại', 'PHONE', 300000, false, 'Phụ cấp điện thoại'),
('Phụ cấp chức vụ', 'POSITION', 1000000, true, 'Phụ cấp chức vụ quản lý');

-- Insert deductions
insert into deductions (name, code, percentage, description) values
('BHXH', 'SI', 8, 'Bảo hiểm xã hội 8%'),
('BHYT', 'HI', 1.5, 'Bảo hiểm y tế 1.5%'),
('BHTN', 'UI', 1, 'Bảo hiểm thất nghiệp 1%'),
('Thuế TNCN', 'PIT', 10, 'Thuế thu nhập cá nhân');

-- Insert company config
insert into company_config (
  company_name, address, phone, email,
  gps_enabled, gps_radius, photo_required,
  work_start_time, work_end_time, standard_work_days, overtime_multiplier
) values (
  'Công ty TNHH Demo HR',
  '123 Đường ABC, Quận 1, TP.HCM',
  '028 1234 5678',
  'hr@demo.com',
  false, 100, false,
  '08:00', '17:00', 26, 1.5
);

-- Insert salary config
insert into salary_config (
  personal_income_tax_rate,
  social_insurance_rate,
  health_insurance_rate,
  unemployment_insurance_rate,
  tax_threshold,
  standard_work_days
) values (10, 8, 1.5, 1, 11000000, 26);
