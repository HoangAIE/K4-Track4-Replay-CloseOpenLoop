# REPORT — Lab Day 12

> Điền **bằng lời và số liệu của chính bạn** (lấy từ màn hình và từ `evidence/*.json`). Mỗi câu 4–8 dòng là đủ. Số không có trong bằng chứng của bạn sẽ bị trừ điểm. Báo cáo công khai trên GitHub; giảng viên đối chiếu với `evidence/` và với bài của các bạn khác.

| | |
|---|---|
| Họ và tên | Ngô Xuân Hoàng |
| MSSV (đúng bằng `--student-id` bạn đã chạy) | 2A202602597 |
| GitHub | HoangAIE |
| Seed chia dữ liệu / seed mô hình (xem `evidence/closedloop.json`, mục `student`) | 8572 / 1042 |
| Số seed huấn luyện bạn dùng (`--seeds`) | 5 (hạt giống: 1042, 1043, 1044, 1045, 1046) |

## Kết quả cuối

Điền từ `evidence/closedloop.json`, `openloop.json`, `gate.json` (cho mỗi mô hình học, lấy **dải qua các seed**).

| Bộ điều khiển | L2 vòng hở (m) | Va chạm vòng kín trên log (%) | Quyết định cổng |
|---|---|---|---|
| constant-velocity | 1.247 m | 21.0% (605/2883) | BLOCK |
| IDM | 1.513 m | 0.1% (4/2883) | RELEASE (baseline) |
| EgoMLP | 0.762 ± 0.001 m (0.760 .. 0.763 m) | 20.7% (12.7% .. 24.8%) | BLOCK |
| PercMLP | 0.621 ± 0.002 m (0.618 .. 0.623 m) | 2.0% (0.6% .. 4.1%) | BLOCK |
| PercMLP+ (sau khi sửa) | 0.817 ± 0.010 m (0.807 .. 0.826 m) | 0.2% (0.17% .. 0.24%) | RELEASE |

## Câu 1 · Dữ liệu
Bước 0 bạn phát hiện những vấn đề gì ở dữ liệu? Vì sao không dùng cột `Acc_LV`, và bạn thay bằng gì? Bao nhiêu quỹ đạo bị loại vì trùng, và vì sao chia theo quỹ đạo?

Trong Bước 0 kiểm tra dữ liệu (data audit), tôi phát hiện ba vấn đề chất lượng nghiêm trọng:
1. Cột gia tốc xe trước `Acc_LV` bị lỗi cảm biến hoặc ghi nhận sai: hệ số tương quan tuyến tính giữa `Acc_LV` và đạo hàm vận tốc d(Speed_LV)/dt chỉ đạt mức 0.04535 (gần như bằng 0, không có tương quan), trong khi gia tốc xe sau `Acc_FAV` có tương quan rất chuẩn đạt 0.92909. Do đó, cột `Acc_LV` hoàn toàn không thể sử dụng trực tiếp để làm nhãn hoặc đặc trưng điều khiển.
2. Trùng lặp dữ liệu: có đúng 383 quỹ đạo giống hệt nhau (trùng lặp toàn bộ chuỗi vị trí, vận tốc và khoảng cách theo mã băm MD5) nằm phân tán ở các ID cách xa nhau trong tập gốc gồm 9993 quỹ đạo. Sau khi loại bỏ các bản ghi trùng lặp này, tập dữ liệu sạch còn lại 9610 quỹ đạo (với tổng số bước thời gian là 992679 dòng, bước thời gian dt = 0.1 s, chiều dài xe trung bình cố định là 4.5 m).
3. Rò rỉ tự tương quan chuỗi thời gian: Các khung thời gian liên tiếp trong cùng một quỹ đạo có tương quan rất cao do tính liên tục động học. Vì vậy, việc phân chia tập huấn luyện và kiểm thử (70% train / 30% test với split_seed = 8572) bắt buộc phải thực hiện theo từng ID quỹ đạo hoàn chỉnh (disjoint trajectories), tuyệt đối không được xáo trộn ngẫu nhiên theo khung (frame-level split) để tránh rò rỉ dữ liệu (data leakage) giữa tương lai và quá khứ.
Để thay thế cột `Acc_LV` bị hỏng, tôi dùng vận tốc xe trước `Speed_LV`, làm mượt qua bộ lọc trung bình trượt với độ rộng cửa sổ là 5 khung hình, sau đó tính vi phân trung tâm đạo hàm số theo thời gian dt = 0.1 s nhằm thu được gia tốc xe trước chính xác và ổn định.

## Câu 2 · Phát lại
Bản refactor float32 khác bit ở bao nhiêu đoạn, vượt dung sai ở bao nhiêu? Thay đổi AEB làm lệch bao nhiêu đoạn, và vì sao lệch ở đúng những khung đó (mở một đoạn ra xem)? Phát theo thời gian thật làm lộ ra điều gì mà phát nhanh nhất che đi?

Khi thực hiện kiểm thử phát lại trên 600 đoạn kiểm thử (kích thước log 9.5 MB):
1. Bản refactor float32 bị khác biệt từng bit ở toàn bộ 600 đoạn (chiếm 100% số đoạn), nhưng có đúng 0 đoạn vượt quá ngưỡng dung sai cho phép (với atol = 0.001 m/s^2 và rtol = 0.001). Độ lệch gia tốc tuyệt đối cực đại chỉ là 0.0004031 m/s^2. Hiện tượng này xảy ra do phép cộng số thực dấu phẩy động 32-bit không có tính kết hợp: ví dụ (0.1 + 0.2) + 0.3 = 0.6000000000000001 trong khi 0.1 + (0.2 + 0.3) = 0.6. Do đó, kiểm thử phần mềm tự hành trong CI/CD bắt buộc phải so sánh theo ngưỡng dung sai kỹ thuật thay vì so sánh bằng bit tuyệt đối.
2. Thay đổi bộ phanh khẩn cấp tự động (AEB với ngưỡng aeb_ttc = 1.5 s) làm lệch vượt dung sai ở đúng 9 đoạn (gồm các đoạn mang chỉ số 69, 171, 208, 263, 298, 307, 505, 559, 584), với độ lệch gia tốc cực đại đạt tới 1.66486 m/s^2. Khi mở chi tiết các đoạn này, sự sai lệch xuất hiện chính xác ở các khung hình mà xe trước phanh gấp làm khoảng cách co hẹp và thời gian va chạm TTC rơi xuống dưới 1.5 s, khiến bộ điều khiển AEB ghi đè lệnh phanh kịch khung B_MAX = 9.0 m/s^2 thay vì duy trì gia tốc mượt của mô hình IDM chuẩn.
3. Chế độ phát lại nhanh nhất (fastest) chạy với giả định CPU vô hạn và hoàn tất tức thì mọi khung hình trong tổng số 59653 khung, nên ghi nhận 0 khung trễ và 0 khung bị rơi. Ngược lại, chế độ thời gian thực (realtime) mô phỏng chính xác hiện tượng gai trễ (timing spikes) với xác suất 1%, làm lộ ra 582 khung bị trễ hạn (late) và 575 khung bị rơi hoàn toàn (dropped, chiếm ~0.96%), dẫn đến 366 đoạn bị sai lệch gia tốc vượt dung sai với độ lệch cực đại lên tới 1032.39 m/s^2. Điều này chứng minh rằng mô phỏng fastest che giấu hoàn toàn các lỗi vi phạm thời gian thực (deadline misses) vốn có thể gây thảm họa trong điều khiển xe thực tế.

## Câu 3 · Kịch bản
Lưới của bạn (tốc độ cruise, giới hạn khoảng cách, số ô): bao nhiêu % ô **không ai tránh được**? Độ trễ phản ứng 0 → 0,6 s làm vùng đâm của IDM tăng bao nhiêu? Log có phủ vùng khó không? (dẫn giới hạn phanh mạnh nhất của người lái trong log, và phần lưới đòi hỏi hơn thế)

Lưới kịch bản cắt đầu (cut-in scenario grid) được thiết lập tại vận tốc cruise v_ego = 14.0 m/s, gồm khoảng cách gap từ 2.76 m đến 59.31 m (60 mốc) và vận tốc đóng dv từ 0.0 m/s đến 14.0 m/s (45 mốc), tạo thành tổng cộng 2700 ô kịch bản:
1. Vùng va chạm vật lý bất khả thi (unavoidable frontier, nơi s_stop = dv * t_react + dv^2 / (2 * B_MAX) lớn hơn khoảng cách hiện tại gap):
   - Tại độ trễ phản ứng t_react = 0.0 s, có 3.63% diện tích ô (tương đương tỷ lệ diện tích 0.03630, với đúng 0 ô lệch giữa bộ mô phỏng FullBrake và công thức vật lý giải tích) là không ai có thể tránh được do vi phạm định luật bảo toàn động học.
   - Khi độ trễ phản ứng tăng từ 0.0 s lên 0.6 s, vùng va chạm của IDM tăng từ 3.63% lên 10.22% diện tích lưới (tăng thêm 6.59% điểm phần trăm diện tích, gấp hơn 2.81 lần). Tuy nhiên, diện tích va chạm quy trách nhiệm cho IDM (attributable collision area) tại cả hai mức độ trễ đều bằng đúng 0.0%, chứng minh IDM chỉ va chạm ở những ô mà quy luật vật lý không thể tránh. Ngược lại, bộ điều khiển vận tốc không đổi (constant-velocity) có diện tích quy trách nhiệm lên tới 70.41% tại t_react = 0.6 s.
2. Về độ phủ của log thực tế đối với vùng khó: Quá trình khai thác (mining) chỉ phát hiện được 614 sự kiện phanh gấp (chiếm vỏn vẹn 6.39% tổng số 9610 quỹ đạo sạch). Phân vị gia tốc phanh trung vị của người lái p50 chỉ là -2.53 m/s^2, phân vị p99 là -4.21 m/s^2, và giới hạn phanh phân vị 99.9% của con người (h_lim) chỉ đạt 3.62 m/s^2. Trong khi đó, phần lưới cut-in đòi hỏi gia tốc vượt quá giới hạn phanh thông thường của con người (> h_lim) chiếm tới 12.67% tổng số ô. Điều này chứng minh log lái xe hàng ngày phần lớn là tình huống êm dịu, không phủ được các góc nguy hiểm ở đuôi phân phối (long tail corner cases).

## Câu 4 · Vòng hở và vòng kín
Dán bảng L2 và tỷ lệ va chạm của bốn bộ điều khiển (kèm hạng ở mỗi cách chấm). Cặp nào đổi thứ tự? Vì sao IDM có L2 như vậy mà vẫn lái tốt? Vì sao EgoMLP có L2 tốt hơn constant-velocity mà vẫn đâm?

Bảng so sánh sai số dự đoán vòng hở L2 (trung bình qua 3 chân trời 1s, 2s, 3s) và tỷ lệ va chạm vòng kín trên 2883 quỹ đạo kiểm thử:
| Bộ điều khiển | Sai số L2 vòng hở (m) | Hạng L2 vòng hở | Tỷ lệ va chạm vòng kín (%) | Hạng vòng kín |
|---|---|---|---|---|
| PercMLP | 0.621 m | 1 (tốt nhất) | 2.00% (58 va chạm trung bình) | 2 |
| EgoMLP | 0.762 m | 2 | 20.67% (596 va chạm trung bình) | 3 |
| constant-velocity | 1.247 m | 3 | 20.99% (605 va chạm) | 4 (kém nhất) |
| IDM | 1.513 m | 4 (kém nhất) | 0.14% (4 va chạm) | 1 (tốt nhất) |

1. Có đúng 3 cặp bộ điều khiển bị đảo lộn thứ tự hoàn toàn giữa vòng hở và vòng kín gồm: `('const-vel', 'IDM')`, `('IDM', 'EgoMLP')`, và `('IDM', 'PercMLP')`.
2. Vì sao IDM có sai số L2 kém nhất (1.513 m) nhưng lái xe an toàn nhất (0.14% va chạm)? Hàm mất mát L2 trong vòng hở đo mức độ khớp từng bước với hành vi lái xe ngẫu nhiên của con người trên tập log (chứa nhiều dao động ga nhỏ, giữ khoảng cách tùy ý). IDM được thiết kế dựa trên phương trình vi phân động học với tham số mong muốn lý tưởng (duy trì khoảng cách an toàn s*), nên không cố bắt chước vi hành vi người lái, dẫn đến L2 cao. Nhưng trong vòng kín, cơ chế phản hồi kín (closed-loop feedback) của IDM tự động điều chỉnh gia tốc tức thời theo khoảng cách và vận tốc tương đối, triệt tiêu tích lũy sai số và phanh kịp thời khi có nguy hiểm.
3. Vì sao EgoMLP có L2 tốt hơn constant-velocity (0.762 m so với 1.247 m) nhưng vẫn đâm va tương đương (20.67% so với 20.99%)? EgoMLP bị "mù" hoàn toàn thông tin xe trước (không nhận đầu vào gap và v_lead). Trong vòng hở, mạng nơ-ron học cách nội suy quỹ đạo xe chủ mượt mà hơn đường thẳng tuyến tính của constant-velocity nên đạt L2 nhỏ hơn trên log giao thông êm dịu. Tuy nhiên trong vòng kín, khi xe trước phanh gấp hoặc giảm tốc, EgoMLP không có bất kỳ kênh nhận thức nào để biết xe trước đang áp sát; nó tiếp tục giữ tốc độ và đâm xuyên vào xe trước. Riêng trên lát cắt phanh gấp (braking slice 195 quỹ đạo), tỷ lệ va chạm của EgoMLP vọt lên tới 47.18%.

## Câu 5 · Một lần chạy chưa đủ
EgoMLP dao động bao nhiêu giữa các seed? Khoảng tin cậy Wilson nói gì? Nếu bạn chỉ chạy đúng một seed thì có thể báo kết quả nào, và vì sao điều đó nguy hiểm?

Khi huấn luyện EgoMLP trên 5 seed ngẫu nhiên [1042, 1043, 1044, 1045, 1046], tỷ lệ va chạm vòng kín dao động rất mạnh qua các seed:
- Seed 1042: 20.81% (600 / 2883 quỹ đạo)
- Seed 1043: 12.73% (367 / 2883 quỹ đạo)
- Seed 1044: 23.73% (684 / 2883 quỹ đạo)
- Seed 1045: 24.77% (714 / 2883 quỹ đạo)
- Seed 1046: 21.33% (615 / 2883 quỹ đạo)
Độ dao động giữa seed tốt nhất (1043) và seed xấu nhất (1045) lên tới 12.04% (tỷ lệ va chạm tăng gần gấp đôi từ 12.73% lên 24.77%).
1. Khoảng tin cậy Wilson mức ý nghĩa 95% (95% Wilson Score Interval) khẳng định tính phân tách thống kê rõ rệt: ở seed 1043, khoảng tin cậy là [11.56%, 14.00%]; trong khi ở seed 1045, khoảng tin cậy là [23.22%, 26.37%]. Hai khoảng tin cậy này hoàn toàn rời rạc (disjoint), không hề giao nhau, chứng tỏ sự khác biệt này không phải là sai số lấy mẫu ngẫu nhiên mà là do mô hình rơi vào các cực tiểu cục bộ (local minima) có chất lượng điều khiển hoàn toàn khác nhau. Ngay cả mô hình PercMLP cũng dao động từ 0.62% (seed 1046) đến 4.06% (seed 1042, chênh lệch hơn 6.5 lần).
2. Sự nguy hiểm của việc chỉ chạy và báo cáo một seed duy nhất:
   - Nếu kỹ sư gặp may mắn và chỉ chạy seed 1043, họ sẽ công bố báo cáo với tỷ lệ va chạm chỉ 12.73%, tạo ấn tượng sai lệch rằng mô hình đạt độ an toàn khả quan. Nhưng khi đưa vào sử dụng thực tế với bộ trọng số từ seed 1045, tỷ lệ va chạm thực tế sẽ vọt lên 24.77%.
   - Việc chỉ dựa vào một lần chạy duy nhất (single seed evaluation) che giấu tính bất định trong khởi tạo trọng số ngẫu nhiên và xáo trộn lô dữ liệu huấn luyện của mạng nơ-ron sâu. Điều này biến việc đánh giá an toàn xe tự hành thành trò chơi may rủi, dẫn đến quyết định phát hành một hệ thống không ổn định và có thể gây tai nạn hàng loạt trong thế giới thực.

## Câu 6 · Tác nhân phản ứng
Dán bảng "xe sau phát lại" và "xe sau phản ứng". `T` bạn hiệu chỉnh là bao nhiêu, xe sau chân thực đến mức nào so với xe không phản ứng? Vì sao IDM bị tính "va chạm giả" khi xe sau chỉ phát lại, và điều này làm đổi kết luận về bộ điều khiển ra sao?

Bảng so sánh tỷ lệ diện tích va chạm trên lưới kịch bản cắt đầu (độ trễ t_react = 0.6 s) giữa môi trường Xe sau phát lại (Replay Rear) và Xe sau phản ứng (Reactive Rear):
| Bộ điều khiển | Xe sau phát lại: Đâm trước (%) | Xe sau phát lại: Đâm sau (%) | Xe sau phát lại: Tổng đâm (%) | Xe sau phản ứng: Đâm trước (%) | Xe sau phản ứng: Đâm sau (%) | Xe sau phản ứng: Tổng đâm (%) |
|---|---|---|---|---|---|---|
| IDM | 10.22% | 70.63% | 80.85% | 10.22% | 0.00% | 10.22% |
| PercMLP | 43.78% | 28.96% | 72.74% | 43.89% | 0.00% | 43.89% |
| PercMLP+ | 10.93% | 69.41% | 80.33% | 10.93% | 0.00% | 10.93% |
| const-vel | 80.63% | 0.00% | 80.63% | 80.63% | 0.00% | 80.63% |

1. Hiệu chỉnh tham số thời gian giãn cách đầu xe T (headway): Giá trị tối ưu tìm được qua phân tích khoảng cách Wasserstein cấp 1 (W1) là T = 1.4 s với khoảng cách nhỏ nhất W1 = 0.3462 so với phân phối thực tế của con người trong log (có trung vị headway người lái là 1.848 s). Tác nhân IDM với T = 1.4 s mô phỏng chân thực hơn rất nhiều so với tác nhân không bao giờ phản ứng (never reacting agent có W1 = 0.8752, độ lệch phân phối giảm hơn 60.4%).
2. Hiện tượng "va chạm giả" (phantom rear collisions): Khi xe sau chỉ phát lại mù quáng chuỗi vị trí trong log, nó tiếp tục lao về phía trước với quỹ đạo cũ bất chấp xe ego đang phanh khẩn cấp để tránh vật cản phía trước. Do đó, bộ điều khiển phanh càng chuẩn xác để cứu va chạm phía trước (như IDM đạt đâm trước chỉ 10.22% hoặc PercMLP+ đạt 10.93%) thì lại càng bị xe sau phát lại đâm trúng từ phía sau với tỷ lệ rất cao (70.63% và 69.41%). Ngược lại, bộ điều khiển kém như PercMLP không phanh đủ dứt khoát thì lại ít bị xe sau đâm hơn (chỉ 28.96%).
3. Thay đổi kết luận về bộ điều khiển: Nếu chỉ nhìn vào tổng va chạm trong thế giới phát lại, người đánh giá sẽ bị đánh lừa rằng PercMLP (tổng va chạm 72.74%) an toàn hơn IDM (80.85%). Nhưng khi đưa vào môi trường xe sau phản ứng thực tế, va chạm phía sau của mọi xe giảm triệt để về đúng 0.00%, bộc lộ bản chất an toàn thực sự phía trước: IDM và PercMLP+ có tỷ lệ va chạm thật chỉ khoảng 10.22% và 10.93%, trong khi PercMLP thực chất đâm va phía trước tới 43.89%.

## Câu 7 · Cổng phát hành và sửa
Quy tắc nào chặn PercMLP và nguyên nhân gốc là gì (dẫn số)? Bạn sửa bằng gì và vì sao nó chữa đúng nguyên nhân? Sau khi qua cổng, PercMLP+ có **tốt hơn** IDM không? Nó có nên được phát hành không, và bạn đề xuất làm gì trước khi quyết định?

1. Các quy tắc cổng chặn PercMLP và nguyên nhân gốc: PercMLP bị chặn bởi 5 trên 7 quy tắc phát hành:
   - R2_closed_loop_logs: Tỷ lệ va chạm trên log kiểm thử là 4.1% (cận trên 95% Wilson CI đạt 4.8%) trượt xa so với ngưỡng baseline IDM 0.1% + biên 1.0% = 1.1%.
   - R3_braking_slice: Va chạm trên lát cắt phanh đạt 14.4% (cận trên CI đạt 20.0%) trượt ngưỡng baseline 1.0% + 5.0% = 6.0%.
   - R4_scenario_grid: Diện tích va chạm quy trách nhiệm trên lưới cut-in đạt 33.7% trượt ngưỡng baseline 0.0% + 2.0% = 2.0%.
   - R5_seed_stability: Va chạm biến thiên từ 0.6% đến 4.1% qua 5 seed (chênh lệch 3.5% vượt biên 1.0%).
   - R6_reactive_world: Va chạm trong thế giới xe sau phản ứng đạt 43.9% trượt ngưỡng baseline 10.2% + 2.0% = 12.2%.
   Nguyên nhân gốc rễ là hiện tượng dịch chuyển phân phối dữ liệu (covariate shift) và tích lũy sai số (compounding errors) cố hữu của học bắt chước (imitation learning) khi lái vòng kín, cộng với việc dữ liệu nhật trình thực tế thiếu vắng các kịch bản cắt đầu nguy hiểm ở đuôi phân phối (tail events).
2. Phương pháp khắc phục hai thành phần:
   - Tăng cường dữ liệu kịch bản: Sinh 20000 cửa sổ kịch bản cut-in tổng hợp bao phủ toàn diện dải khoảng cách và vận tốc đóng, được dán nhãn bởi chuyên gia IDM để bù đắp vùng phân phối bị thiếu.
   - Thuật toán DAgger (Dataset Aggregation): Thực hiện 2 vòng lặp DAgger với thời gian huấn luyện 763 giây, cho mô hình tự lái vòng kín trên các quỹ đạo để thăm dò các trạng thái lệch phân phối, sau đó truy vấn chuyên gia IDM gắn nhãn hành động khắc phục tương ứng để huấn luyện mạng nơ-ron tự sửa sai.
3. Đánh giá PercMLP+ sau khi sửa:
   - PercMLP+ vượt qua xuất sắc cả 7/7 quy tắc cổng và nhận quyết định RELEASE: va chạm vòng kín trên log giảm xuống 0.2% (cận trên CI đạt 0.5%), diện tích va chạm quy trách nhiệm trên lưới cut-in giảm từ 33.7% xuống còn 0.7%, độ biến thiên qua 5 seed cực kỳ ổn định trong dải 0.17% .. 0.24% (độ lệch chỉ 0.07%).
   - Tuy nhiên, theo đúng chuẩn mực đánh giá an toàn, PercMLP+ **KHÔNG HỀ TỐT HƠN IDM**, mà chỉ đạt mức **không kém hơn (non-inferior)** trong giới hạn dung sai thống kê cho phép. Trên thực tế, IDM vẫn vượt trội ở các đặc tính an toàn cốt lõi: diện tích va chạm quy trách nhiệm của IDM là 0.0% tuyệt đối (so với 0.7% của PercMLP+), va chạm trên log của IDM chỉ 0.14% (so với 0.21% của PercMLP+). Hơn nữa, khi thử nghiệm ngoài phân phối ở tốc độ cao v_ego = 20.0 m/s, diện tích va chạm của PercMLP+ bị thoái hóa lên tới 1.85% (trong khi IDM vẫn giữ vững 0.0%). PercMLP+ là mô hình hộp đen nơ-ron tiềm ẩn rủi ro hành vi không giải thích được và tốn nhiều tài nguyên tính toán hơn.
4. Đề xuất quyết định phát hành: Chưa nên phát hành thương mại ngay ra thị trường. Trước khi quyết định, cần thực hiện ba bước kiểm chứng bắt buộc: (i) Đánh giá mô phỏng 3D cảm biến đầy đủ (camera, lidar) trong CARLA, (ii) Kiểm thử phần cứng máy tính nhúng trong vòng lặp (HIL) để đo độ trễ suy luận, và (iii) Thử nghiệm thực địa trên đường thử kín (closed track) với tài xế an toàn giám sát can thiệp khẩn cấp.

## Câu 8 · Bài lab này không chứng minh được gì
Chọn **ít nhất ba** giới hạn quan trọng nhất đối với việc quyết định phát hành và giải thích vì sao mỗi cái làm kết luận của bạn kém chắc chắn. Điều gì cần làm tiếp để thu hẹp khoảng cách đến thế giới thật?

Để đưa ra quyết định phát hành một hệ thống lái tự động an toàn trong thực tế, các kết quả đạt được trong bài lab này còn cách rất xa thế giới thực do ba giới hạn kỹ thuật cốt lõi sau:
1. Mô hình động học 1D dạng chất điểm giản lược (1D Point-mass Kinematics): Bài lab giả định xe là chất điểm chuyển động thuần túy trên một trục dọc duy nhất, bỏ qua toàn bộ động lực học xe nhiều bậc tự do (lateral dynamics, roll, pitch), không mô phỏng độ trượt ma sát lốp xe (tire-road friction) trong các điều kiện thời tiết khắc nghiệt (trời mưa, tuyết, đường ướt trơn trượt), và bỏ qua độ trễ trễ cơ điện tử của bộ chấp hành phanh/ga (actuator dynamics lag) cũng như hệ thống treo. Trong thực tế, việc kích hoạt phanh khẩn cấp với gia tốc cực đại 9.0 m/s^2 trên mặt đường trơn hoặc khi đang đánh lái né vật cản có thể gây mất lái, văng đuôi hoặc lật xe mà mô hình 1D không thể phản ánh.
2. Giả định cảm biến và nhận thức lý tưởng (Perception & Sensor Idealization): Bài lab cung cấp trực tiếp cho bộ điều khiển khoảng cách chính xác gap và vận tốc tương đối dv từ ground truth của dữ liệu mô phỏng, hoặc chỉ bổ sung nhiễu Gauss độc lập tĩnh (+-1.0 m cho khoảng cách và +-0.5 m/s cho vận tốc). Trên xe tự hành thực tế, luồng dữ liệu nhận thức đến từ camera, LiDAR và Radar phải đối mặt với hàng loạt hiện tượng phức tạp: vật thể bị che khuất một phần (occlusion), nhận diện nhầm hoặc bỏ sót đối tượng (false positives/negatives), độ trễ suy luận của mạng nơ-ron thị giác (perception latency), hiện tượng trôi khung theo dõi (tracking jitter), điều kiện ánh sáng chói lóa hay thời tiết sương mù, cũng như góc chết cảm biến khi xe khác chuyển làn đột ngột.
3. Thiếu vắng tính tương tác xã hội đa tác nhân phức tạp (Multi-agent Interactive Behavior): Môi trường thử nghiệm chỉ bao gồm tối đa một xe đi trước và một xe bám đuôi cùng làn chạy theo quy luật IDM tĩnh với T = 1.4 s. Giao thông đô thị thực tế là một môi trường mở đa tác nhân có tính tương tác xã hội phi tuyến cao: người đi bộ băng qua đường, người điều khiển xe máy chen lấn, xe tải lớn che tầm nhìn, các phương tiện chuyển làn chèn ép bất ngờ, hoặc các hành vi nhường đường và phản ứng tập thể. Việc một bộ điều khiển vượt qua bài kiểm tra đơn làn không hề bảo đảm rằng nó sẽ xử lý an toàn trong nút giao phức tạp.

Lộ trình kỹ thuật cần làm tiếp theo để thu hẹp khoảng cách tới thế giới thật (Roadmap to Real World):
- Bước 1 (Mô phỏng SIL đầy đủ): Tích hợp bộ điều khiển vào phần mềm mô phỏng thế giới ảo 3D độ chân thực cao (như CARLA hoặc BeamNG.tech) có mô hình động lực học lốp đa vật thể, bản đồ đường cong, độ dốc, thời tiết thay đổi và mô phỏng luồng cảm biến ảnh raw từ camera/LiDAR.
- Bước 2 (Kiểm thử HIL nhúng): Chạy mô hình trên máy tính điều khiển nhúng chuyên dụng chuẩn ô tô (như NVIDIA DRIVE Orin hoặc Texas Instruments TDA4) kết nối với hệ thống phần cứng trong vòng lặp (Hardware-in-the-Loop - HIL) để đo kiểm chính xác giới hạn tiêuhtu điện năng, nhiệt độ, độ trễ bus CAN, độ trễ suy luận AI và kiểm thử ngắt thời gian thực.
- Bước 3 (Thử nghiệm đường kín và kiểm định an toàn độc lập): Triển khai thuật toán lên xe thử nghiệm thực tế trên đường thử kín (closed proving grounds), thực hiện các bài thử kịch bản nguy hiểm tiêu chuẩn quốc tế (như Euro NCAP cut-in, pedestrian collision avoidance) với các mô hình xe giả lập bằng xốp mềm trước khi tiến hành thử nghiệm có tài xế an toàn trên đường phố công cộng.
