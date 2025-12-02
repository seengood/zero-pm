import { supabase } from './supabaseClient';
import { Task } from '@/types/database';

export interface OptimisticLockResult {
    success: boolean;
    error?: string;
    newVersion?: number;
    currentVersion?: number;
    expectedVersion?: number;
}

/**
 * 낙관적 잠금을 사용하여 Task를 업데이트합니다.
 * @param taskId - 업데이트할 Task의 ID
 * @param expectedVersion - 클라이언트가 읽었던 버전
 * @param updates - 업데이트할 필드들
 * @param maxRetries - 최대 재시도 횟수 (기본값: 3)
 */
export async function updateTaskWithOptimisticLock(
    taskId: string,
    expectedVersion: number,
    updates: Partial<Task>,
    maxRetries: number = 3
): Promise<OptimisticLockResult> {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            // RPC 호출로 낙관적 잠금 함수 실행
            const { data, error } = await supabase.rpc('update_task_with_version', {
                p_task_id: taskId,
                p_expected_version: expectedVersion,
                p_updates: updates,
            });

            if (error) {
                console.error('낙관적 잠금 업데이트 오류:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            // 성공 시 결과 반환
            if (data.success) {
                return {
                    success: true,
                    newVersion: data.new_version,
                };
            }

            // 버전 충돌 시 재시도
            if (data.error === 'Version conflict') {
                console.warn(
                    `버전 충돌 감지 (시도 ${retries + 1}/${maxRetries}):`,
                    `현재 버전 ${data.current_version}, 예상 버전 ${data.expected_version}`
                );

                // 최신 버전 가져오기
                const { data: latestTask, error: fetchError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', taskId)
                    .single();

                if (fetchError || !latestTask) {
                    return {
                        success: false,
                        error: 'Task를 다시 가져오는 데 실패했습니다.',
                    };
                }

                // 최신 버전으로 재시도
                expectedVersion = latestTask.version;
                retries++;
                continue;
            }

            // 기타 오류
            return {
                success: false,
                error: data.error,
            };
        } catch (error) {
            console.error('예외 발생:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류',
            };
        }
    }

    // 최대 재시도 횟수 초과
    return {
        success: false,
        error: `최대 재시도 횟수(${maxRetries})를 초과했습니다. 다시 시도해 주세요.`,
    };
}

/**
 * CPM 계산 결과를 트랜잭션으로 저장합니다.
 * @param results - CPM 계산 결과 배열
 */
export async function saveCPMResults(
    results: Array<{
        id: string;
        early_start: string;
        early_finish: string;
        late_start: string;
        late_finish: string;
        total_float: number;
        is_critical: boolean;
    }>
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    try {
        const { data, error } = await supabase.rpc('save_cpm_results', {
            p_results: results,
        });

        if (error) {
            console.error('CPM 결과 저장 오류:', error);
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: data.success,
            error: data.error,
            updatedCount: data.updated_count,
        };
    } catch (error) {
        console.error('예외 발생:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
        };
    }
}

/**
 * Baseline을 생성합니다.
 * @param projectId - 프로젝트 ID
 * @param name - Baseline 이름
 * @param description - Baseline 설명
 * @param baselineNumber - Baseline 번호 (1-11)
 */
export async function createBaseline(
    projectId: string,
    name: string,
    description: string,
    baselineNumber: number
): Promise<{
    success: boolean;
    error?: string;
    baselineId?: string;
    snapshotCount?: number;
}> {
    try {
        const { data, error } = await supabase.rpc('create_baseline', {
            p_project_id: projectId,
            p_name: name,
            p_description: description,
            p_baseline_number: baselineNumber,
        });

        if (error) {
            console.error('Baseline 생성 오류:', error);
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: data.success,
            error: data.error,
            baselineId: data.baseline_id,
            snapshotCount: data.snapshot_count,
        };
    } catch (error) {
        console.error('예외 발생:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
        };
    }
}
