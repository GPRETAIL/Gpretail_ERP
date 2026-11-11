<?php

namespace Tests\Feature\Shared;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Group By for any paginated list (PaginationService): group_summary=1 answers a summary from the
 * list's own query (store scope + search kept), and an expanded group's rows are filtered by its
 * column -- including lists whose controller never handled column_filters itself.
 */
class ListGroupByTest extends TestCase
{
    use RefreshDatabase;

    private function setUpStores(): array
    {
        $one = Store::create(['name' => 'Group One', 'code' => 'GRP-ONE', 'is_active' => true]);
        $two = Store::create(['name' => 'Group Two', 'code' => 'GRP-TWO', 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'group-owner', 'email' => 'group-owner@example.test', 'password' => 'secret', 'role' => 'admin']));
        foreach ([[$one, 'A1', 'Alpha'], [$one, 'A2', 'Alpha'], [$one, 'B1', 'Beta'], [$two, 'X1', 'Alpha']] as [$store, $code, $name]) {
            $this->withHeader('X-Store-Id', (string) $store->id)
                ->postJson('/api/hr-departments', ['name' => $name, 'code' => $code])->assertCreated();
        }

        return [$one, $two];
    }

    public function test_a_list_answers_a_group_summary_from_its_own_store_scoped_query(): void
    {
        [$one] = $this->setUpStores();
        $summary = $this->withHeader('X-Store-Id', (string) $one->id)
            ->getJson('/api/hr-departments?paginate=1&group_summary=1&group_by=name&limit=20')
            ->assertOk()->assertJsonPath('success', true)->json();

        $counts = collect($summary['data'])->pluck('row_count', 'label')->all();
        $this->assertSame(['Alpha' => 2, 'Beta' => 1], $counts); // store Two's Alpha is not counted
        $this->assertSame(3, $summary['meta']['total_matching_rows']);

        $this->withHeader('X-Store-Id', (string) $one->id)
            ->getJson('/api/hr-departments?paginate=1&group_summary=1&group_by=description')
            ->assertStatus(422);
    }

    public function test_an_expanded_group_lists_only_its_own_rows(): void
    {
        [$one] = $this->setUpStores();
        $filters = json_encode([['field' => 'name', 'operator' => 'equals', 'value' => 'Alpha']]);
        $rows = $this->withHeader('X-Store-Id', (string) $one->id)
            ->getJson('/api/hr-departments?paginate=1&page=1&limit=50&column_filters='.urlencode($filters))
            ->assertOk()->json('data');
        $this->assertEqualsCanonicalizing(['A1', 'A2'], collect($rows)->pluck('code')->all());

        // Only the resource's groupable columns are accepted -- anything else is ignored.
        $other = json_encode([['field' => 'store_id', 'operator' => 'equals', 'value' => '999999']]);
        $all = $this->withHeader('X-Store-Id', (string) $one->id)
            ->getJson('/api/hr-departments?paginate=1&page=1&limit=50&column_filters='.urlencode($other))
            ->assertOk()->json('data');
        $this->assertCount(3, $all);
    }

    public function test_a_joined_group_label_does_not_clash_with_the_lists_own_search(): void
    {
        [$one, $two] = $this->setUpStores();
        User::create(['name' => 'Kavi One', 'username' => 'kavi-one', 'email' => 'kavi1@example.test', 'password' => 'secret', 'role' => 'cashier', 'store_id' => $one->id]);
        User::create(['name' => 'Kavi Two', 'username' => 'kavi-two', 'email' => 'kavi2@example.test', 'password' => 'secret', 'role' => 'cashier', 'store_id' => $two->id]);

        $summary = $this->getJson('/api/user-access?group_summary=1&group_by=company&search=Kavi')
            ->assertOk()->assertJsonPath('success', true)->json('data');
        $labels = collect($summary)->pluck('row_count', 'label')->all();
        $this->assertSame(1, $labels['Group One'] ?? null);
        $this->assertSame(1, $labels['Group Two'] ?? null);
    }
}
