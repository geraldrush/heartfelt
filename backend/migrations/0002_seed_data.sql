INSERT INTO religions (id, name) VALUES
  ('christian', 'Christian'),
  ('muslim', 'Muslim'),
  ('hindu', 'Hindu'),
  ('jewish', 'Jewish'),
  ('buddhist', 'Buddhist'),
  ('atheist', 'Atheist'),
  ('agnostic', 'Agnostic'),
  ('other', 'Other'),
  ('prefer_not_to_say', 'Prefer not to say');

INSERT INTO races (id, name) VALUES
  ('black_african', 'Black African'),
  ('white', 'White'),
  ('coloured', 'Coloured'),
  ('indian_asian', 'Indian/Asian'),
  ('other', 'Other'),
  ('prefer_not_to_say', 'Prefer not to say');

INSERT INTO education_levels (id, name) VALUES
  ('high_school', 'High School'),
  ('diploma', 'Diploma'),
  ('bachelor', 'Bachelor'),
  ('honours', 'Honours'),
  ('masters', 'Masters'),
  ('phd', 'PhD'),
  ('other', 'Other');

INSERT INTO cities (id, name, province, lat, lng) VALUES
  ('cpt', 'Cape Town', 'Western Cape', -33.9249, 18.4241),
  ('jhb', 'Johannesburg', 'Gauteng', -26.2041, 28.0473),
  ('pta', 'Pretoria', 'Gauteng', -25.7479, 28.2293),
  ('dbn', 'Durban', 'KwaZulu-Natal', -29.8587, 31.0218),
  ('pe', 'Port Elizabeth', 'Eastern Cape', -33.9608, 25.6022),
  ('blm', 'Bloemfontein', 'Free State', -29.0852, 26.1596),
  ('plk', 'Polokwane', 'Limpopo', -23.9045, 29.4689),
  ('nel', 'Nelspruit', 'Mpumalanga', -25.4753, 30.9703),
  ('kim', 'Kimberley', 'Northern Cape', -28.7282, 24.7499),
  ('rus', 'Rustenburg', 'North West', -25.6672, 27.2423),
  ('hre', 'Harare', 'Harare', -17.8252, 31.0335),
  ('byo', 'Bulawayo', 'Bulawayo', -20.1325, 28.6265),
  ('mut', 'Mutare', 'Manicaland', -18.9707, 32.6709),
  ('gwe', 'Gweru', 'Midlands', -19.4500, 29.8167),
  ('kwk', 'Kwekwe', 'Midlands', -18.9281, 29.8149),
  ('mvg', 'Masvingo', 'Masvingo', -20.0637, 30.8277),
  ('chk', 'Chinhoyi', 'Mashonaland West', -17.3667, 30.2000),
  ('bdr', 'Bindura', 'Mashonaland Central', -17.3019, 31.3306),
  ('mrd', 'Marondera', 'Mashonaland East', -18.1853, 31.5519),
  ('vfa', 'Victoria Falls', 'Matabeleland North', -17.9243, 25.8572);
